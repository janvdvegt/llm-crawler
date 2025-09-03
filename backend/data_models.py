from pathlib import Path
import os
import yaml
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from Levenshtein import distance

from paths import CONFIGS_PATH, EVALS_PATH


class EvaluationResult(BaseModel):
    levenshtein_distance_norm: float = Field(alias="abs_levenshtein_distance_norm")
    exact_match: bool
    missing_content: bool
    extra_content: bool
    config_name: str
    domain: str
    url: str
    expected_content: str
    parsed_content: str
    
    model_config = {"populate_by_name": True}


class EvaluationRun(BaseModel):
    results: list[EvaluationResult]
    datetime_str: str
    id: str = Field(default="", frozen=True)

    def get_evaluation_results(self, domain: Optional[str] = None, config_name: Optional[str] = None) -> 'EvaluationResults':
        results = self.results
        if domain is not None:
            results = [result for result in results if result.domain == domain]
        if config_name is not None:
            results = [result for result in results if result.config_name == config_name]
        return EvaluationResults(
            levenshtein_distance_norm=sum([result.levenshtein_distance_norm for result in results]) / len(results),
            exact_match=sum([result.exact_match for result in results]) / len(results),
            missing_content=sum([result.missing_content for result in results]) / len(results),
            extra_content=sum([result.extra_content for result in results]) / len(results),
            domain=domain,
            config_name=config_name
        )
    
    @model_validator(mode="after")
    def _derive_id(self):
        object.__setattr__(self, "id", self.datetime_str)
        return self


class EvaluationResults(BaseModel):
    levenshtein_distance_norm: float
    exact_match: float
    missing_content: float
    extra_content: float
    domain: Optional[str] = None
    config_name: Optional[str] = None


class ValidationLabel(BaseModel):
    content: str


class URL(BaseModel):
    url: str
    prefix: Optional[str] = None
    raw_content: Optional[str] = None
    parsed_content: Optional[str] = None
    id: str = Field(default="", frozen=True)

    def save(self):
        from db import save
        save(self)

    @classmethod
    def load(cls, url: str) -> Optional["URL"]:
        from db import load
        return load(cls, url)

    @model_validator(mode="after")
    def _derive_id(self):
        object.__setattr__(self, "id", self.url)
        return self


class URLQueueItem(BaseModel):
    url: URL
    process_from_unix_timestamp: int
    times_queued: int = 0


class SampleURL(BaseModel):
    url: str
    raw_content: Optional[str] = None
    label: Optional[ValidationLabel] = None

    def save(self, domain: str, validation: bool = False) -> Path:
        url_path = self.url.split('/')[-1]
        if validation:
            file_name = EVALS_PATH / domain / "validation" / (url_path + ".yaml")
        else:
            file_name = EVALS_PATH / domain / "input" / (url_path + ".yaml")
        file_name.parent.mkdir(parents=True, exist_ok=True)
        content = yaml.safe_dump(self.model_dump(), sort_keys=False)
        with open(file_name, "w") as f:
            f.write(content)
        return file_name

    @classmethod
    def load(cls, domain: str, file_name: str, validation: bool = False) -> "SampleURL":
        if not file_name.endswith(".yaml"):
            file_name = file_name + ".yaml"
        if validation:
            file_name = EVALS_PATH / domain / "validation" / file_name
        else:
            file_name = EVALS_PATH / domain / "input" / file_name
        with open(file_name, "r") as f:
            content = yaml.safe_load(f)
        return cls(**content)
    
    @classmethod
    def from_url(cls, url: str) -> "SampleURL":
        from load_html import load_raw_html
        
        raw_content = load_raw_html(url)
        return cls(url=url, raw_content=raw_content)

    def evaluate(self, parsed_content: str, config_name: str, domain: str) -> EvaluationResult:
        levenshtein_distance = distance(self.label.content, parsed_content)
        levenshtein_distance_norm = levenshtein_distance / len(self.label.content)
        exact_match = self.label.content == parsed_content
        missing_content = self.label.content not in parsed_content
        extra_content = parsed_content not in self.label.content
        return EvaluationResult(levenshtein_distance_norm=levenshtein_distance_norm,
                                exact_match=exact_match,
                                missing_content=missing_content,
                                extra_content=extra_content,
                                config_name=config_name,
                                domain=domain,
                                url=self.url,
                                expected_content=self.label.content,
                                parsed_content=parsed_content)


class ParserParameters(BaseModel):
    root: list[str]
    keep: list[str]
    drop: list[str]
    unwrap: list[str]

    @field_validator("root")
    @classmethod
    def _normalize_root(cls, v):
        if isinstance(v, str):
            return [v]
        return v
    
    def __add__(self, other: "ParserParameters") -> "ParserParameters":
        return ParserParameters(root=list(set(self.root) | set(other.root)),
                                keep=list(set(self.keep) | set(other.keep)),
                                drop=list(set(self.drop) | set(other.drop)),
                                unwrap=list(set(self.unwrap) | set(other.unwrap)))


class ParserConfig(BaseModel):
    parameters: ParserParameters
    prefix_name: str
    id: str = Field(default="", frozen=True)

    @model_validator(mode="after")
    def _derive_id(self):
        object.__setattr__(self, "id", self.prefix_name)
        return self

    def __add__(self, other: "ParserConfig") -> "ParserConfig":
        return ParserConfig(parameters=self.parameters + other.parameters,
                            prefix_name=self.prefix_name,
                            id=self.id)


class URLPrefix(BaseModel):
    prefix: str
    sample_urls: list[SampleURL] = []
    validation_urls: Optional[list[SampleURL]] = []
    parser_config: Optional[ParserConfig] = None
    processing_status: Optional[str] = None  # None = not processed, "in_progress", "completed", "failed"
    id: str = Field(default="", frozen=True)

    @model_validator(mode="after")
    def _derive_id(self):
        object.__setattr__(self, "id", self.prefix)
        return self

    @classmethod
    def from_evals(cls, domain: str) -> "URLPrefix":
        prefix = domain
        sample_urls = []
        validation_urls = []
        for file_name in os.listdir(EVALS_PATH / domain / "input"):
            sample_urls.append(SampleURL.load(domain, file_name, validation=False))
        for file_name in os.listdir(EVALS_PATH / domain / "validation"):
            validation_urls.append(SampleURL.load(domain, file_name, validation=True))
        return cls(prefix=prefix,
                   sample_urls=sample_urls,
                   validation_urls=validation_urls if validation_urls else None)


class URLPrefixWithUrls(BaseModel):
    """Wrapper around URLPrefix that includes all associated URLs"""
    url_prefix: URLPrefix
    all_urls: list[str] = Field(description="All URLs associated with this prefix")
    url_count: int = Field(description="Total number of URLs")
    
    @classmethod
    def from_url_prefix(cls, url_prefix: URLPrefix) -> "URLPrefixWithUrls":
        """Create URLPrefixWithUrls from a URLPrefix object"""
        # Extract all URLs from sample_urls and validation_urls
        all_urls = []
        
        # Add URLs from sample_urls
        for sample_url in url_prefix.sample_urls:
            all_urls.append(sample_url.url)
        
        # Add URLs from validation_urls if they exist
        if url_prefix.validation_urls:
            for validation_url in url_prefix.validation_urls:
                all_urls.append(validation_url.url)
        
        # Add URLs from the database that have this prefix
        from db import find_urls_with_prefix
        db_urls = find_urls_with_prefix(url_prefix.prefix)
        for url_obj in db_urls:
            all_urls.append(url_obj.url)
        
        # Remove duplicates and sort
        unique_urls = sorted(list(set(all_urls)))
        
        return cls(
            url_prefix=url_prefix,
            all_urls=unique_urls,
            url_count=len(unique_urls)
        )


class ParserGeneratorConfig(BaseModel):
    config_name: str
    openai_model: str
    reasoning_level: str = "minimal"
    instructions_prompt: str
    input_prompt_template: str
    error_prompt: Optional[str] = None
    reflection_prompt: Optional[str] = None
    id: str = Field(default="", frozen=True)

    @model_validator(mode="after")
    def _derive_id(self):
        object.__setattr__(self, "id", self.config_name)
        return self

    @property
    def is_production(self) -> bool:
        """Dynamically check if this config is the current production config"""
        from db import get_production_config
        production_config = get_production_config()
        return self.config_name == production_config

    @classmethod
    def from_config(cls, config_name: str) -> "ParserGeneratorConfig":
        with open(CONFIGS_PATH / f"{config_name}.yaml", "r") as f:
            config = yaml.load(f, Loader=yaml.SafeLoader)
        config["config_name"] = config_name
        return cls(**config)
