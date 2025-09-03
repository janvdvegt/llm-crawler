from functools import reduce
import openai
from bs4 import BeautifulSoup, Tag, NavigableString
from typing import Iterable, List, Optional
import re


from clean_html import clean_html
from data_models import ParserParameters, URLPrefix, ParserGeneratorConfig, ParserConfig, SampleURL


client = openai.OpenAI()


class Parser:
    def __init__(self, config: ParserConfig):
        self.config = config

    def _first_match(self, soup: BeautifulSoup, selectors: Iterable[str]) -> Optional[Tag]:
        for sel in selectors or []:
            el = soup.select_one(sel)
            if el:
                return el
        return None

    def _trim_soup(self, soup: BeautifulSoup) -> BeautifulSoup:
        if self.config.parameters.root:
            roots = []
            for sel in self.config.parameters.root:
                roots.extend(soup.select(sel))

            if roots:
                keep_set = set()
                for r in roots:
                    keep_set.add(id(r))
                    for d in r.descendants:
                        if isinstance(d, Tag):
                            keep_set.add(id(d))
                    for p in r.parents:
                        if isinstance(p, Tag):
                            keep_set.add(id(p))

                for el in list(soup.find_all(True)):
                    if el.name in ("html", "head", "body"):
                        continue
                    if id(el) not in keep_set:
                        el.decompose()

        # 1. Drop unwanted elements
        if self.config.parameters.drop:
            for selector in self.config.parameters.drop:
                for el in soup.select(selector):
                    el.decompose()

        # 2) Unwrap elements (remove tag but keep its children)
        if self.config.parameters.unwrap:
            for selector in self.config.parameters.unwrap:
                for el in soup.select(selector):
                    el.unwrap()
        
        # 3) Keep-only pruning (preserve kept nodes, their ancestors, and descendants)
        if self.config.parameters.keep:
            keep_nodes: List[Tag] = []
            for selector in self.config.parameters.keep:
                keep_nodes.extend(soup.select(selector))

            if keep_nodes:
                keep_set = set()

                # Add kept nodes, their ancestors, and descendants
                for kn in keep_nodes:
                    keep_set.add(id(kn))
                    # ancestors up to <body>/<html>
                    for p in kn.parents:
                        if isinstance(p, Tag):
                            keep_set.add(id(p))
                    # all descendants
                    for d in kn.descendants:
                        if isinstance(d, Tag):
                            keep_set.add(id(d))

                # Walk the tree and drop anything not in keep_set
                # Iterate over a static list to avoid mutation during traversal issues
                for el in list(soup.find_all(True)):
                    if el.name in ("html", "head", "body"):
                        continue
                    if id(el) not in keep_set:
                        el.decompose()
            
        return soup

    def _soup_to_text(self, soup: BeautifulSoup) -> str:
        soup = clean_html(soup)

        # ensure block elements break lines
        blockish = {
            "p","div","section","article","header","footer","aside","main","nav",
            "h1","h2","h3","h4","h5","h6","li","ul","ol","table","thead","tbody",
            "tr","td","th","figure","figcaption","pre"
        }
        for tag in soup.find_all(blockish):
            # add a newline before/after so get_text() separates blocks
            tag.insert_before(NavigableString("\n"))
            tag.append(NavigableString("\n"))

        text = soup.get_text(separator=" ", strip=True)

        # normalize whitespace and keep reasonable paragraph breaks
        text = re.sub(r"[ \t]+", " ", text)        # collapse runs of spaces
        text = re.sub(r"\n{3,}", "\n\n", text)     # max two blank lines
        text = text.strip()

        return text

    def parse(self, content: str) -> str:
        soup = BeautifulSoup(content, "lxml")
        soup = self._trim_soup(soup)
        text = self._soup_to_text(soup)
        return text


class ParserGenerator:
    def __init__(self, config: ParserGeneratorConfig):
        self.config = config

    @classmethod
    def from_config(cls, config_name: str) -> "ParserGenerator":
        config = ParserGeneratorConfig.from_config(config_name)
        return cls(config=config)

    def _generate_html_content_snippet(self, sample_url: SampleURL) -> str:
        cleaned_content = clean_html(sample_url.raw_content)
        return f"{cleaned_content}"

    def _generate_input_prompt(self,
                               sample_urls: list[SampleURL],
                               previous_parser_config: Optional[ParserConfig] = None,
                               parsed_content: Optional[list[str]] = None,
                               error_message: Optional[str] = None) -> str:
        html_content = "\n".join(
            [self._generate_html_content_snippet(sample_url) for sample_url in sample_urls]
        )
        previous_parser_config_str = ""
        if previous_parser_config:
            previous_parser_config_str = f"Here is the previous parser config: {previous_parser_config.model_dump_json()}"
        parsed_content_str = ""
        if parsed_content:
            parsed_content_str = f"Here is the parsed content based on the previous parser config: {parsed_content}"
        error_message_str = ""
        if error_message:
            error_message_str = f"Here is the error message: {error_message}"
        
        return self.config.input_prompt_template.format(
            html_content=html_content,
            previous_parser_config=previous_parser_config_str,
            parsed_content_str=parsed_content_str,
            error_message=error_message_str
        )

    def _format_parser_parameters(self) -> dict:
        schema = ParserParameters.model_json_schema()
        schema["additionalProperties"] = False
        
        format = {
            "type": "json_schema",
            "name": "parser_config",
            "strict": True,
            "schema": schema,
        }
        return format


    def _generate_parser_num_examples(self, url_prefix: URLPrefix, num_examples: int) -> Parser:
        input_prompt = self._generate_input_prompt(url_prefix.sample_urls[:num_examples])

        format = self._format_parser_parameters()

        response = client.responses.create(
            model=self.config.openai_model,
            instructions=self.config.instructions_prompt,
            reasoning={"effort": self.config.reasoning_level},
            input=input_prompt,
            text={"format": format},
        )
        parser_parameters = ParserParameters.model_validate_json(response.output_text, strict=True)
        parser_config = ParserConfig(parameters=parser_parameters, prefix_name=url_prefix.prefix)
        return Parser(config=parser_config)

    def _generate_parser_with_parsing_mistake(self, sample_url: SampleURL, previous_parser_config: ParserConfig, error_message: str) -> ParserConfig:
        input_prompt = self._generate_input_prompt([sample_url], previous_parser_config, error_message)
        format = self._format_parser_parameters()
        response = client.responses.create(
            model=self.config.openai_model,
            instructions=self.config.instructions_prompt + "\n" + self.config.error_prompt,
            reasoning={"effort": "minimal"},
            input=input_prompt,
            text={"format": format},
        )
        parser_parameters = ParserParameters.model_validate_json(response.output_text, strict=True)
        parser_config = ParserConfig(parameters=parser_parameters, prefix_name=previous_parser_config.prefix_name)
        return parser_config

    def _validate_parser(self, parser: Parser, sample_urls: list[SampleURL]) -> Optional[tuple[SampleURL, str]]:
        for sample_url in sample_urls:
            try:
                parser.parse(sample_url.raw_content)
            except Exception as e:
                return (sample_url, str(e))
        return None
    
    def _reflect_on_parser(self, parser: Parser, sample_urls: list[SampleURL], prefix_name: str) -> ParserConfig:
        format = self._format_parser_parameters()
        parser_configs = []
        for sample_url in sample_urls:
            parsed_content = parser.parse(sample_url.raw_content)
            input_prompt = self._generate_input_prompt([sample_url], parser.config, [parsed_content])
            response = client.responses.create(
                model=self.config.openai_model,
                instructions=self.config.instructions_prompt + "\n" + self.config.reflection_prompt,
                reasoning={"effort": "minimal"},
                input=input_prompt,
                text={"format": format},
            )
            parser_parameters = ParserParameters.model_validate_json(response.output_text, strict=True)
            parser_config = ParserConfig(parameters=parser_parameters, prefix_name=prefix_name)
            parser_configs.append(parser_config)
        return reduce(lambda x, y: x + y, parser_configs)

    def generate_parser(self, url_prefix: URLPrefix) -> Parser:
        num_examples = len(url_prefix.sample_urls)
        success = False
        while num_examples > 0 and not success:
            try:
                parser = self._generate_parser_num_examples(url_prefix, num_examples)
                validation_result = self._validate_parser(parser, url_prefix.sample_urls)
                if validation_result:
                    print(f"Validation failed with error: {validation_result}")
                    sample_url, error_message = validation_result
                    if self.config.error_prompt is not None:
                        parser = self._generate_parser_with_parsing_mistake(sample_url, parser.config, error_message)
                        validation_result = self._validate_parser(parser, url_prefix.sample_urls)
                    if validation_result:
                        raise Exception(f"Failed to generate parser with error: {error_message}")
                else:
                    success = True
            except Exception as e:
                if "Your input exceeds the context window of this model" in str(e):
                    num_examples -= 1
                else:
                    raise e
        if success:
            if self.config.reflection_prompt is not None:
                print("Reflection on parser")
                parser_configs = self._reflect_on_parser(parser, url_prefix.sample_urls, url_prefix.prefix)
                parser = Parser(config=parser_configs)
                return parser
            else:
                return parser
        raise Exception("Failed to generate parser")
