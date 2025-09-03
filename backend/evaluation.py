#!/usr/bin/env python3
"""
CLI for parser evaluation with domain, input URLs, and validation URLs.
"""

import argparse
import sys
from typing import List, Optional
import os
from datetime import datetime

from db import save
from data_models import EvaluationRun, SampleURL, URLPrefix, EvaluationResult, EvaluationResults
from parser import ParserGenerator
from paths import EVALS_PATH


def aggregate_evaluation_results(evaluation_results: List[EvaluationResult],
                                 domain: Optional[str] = None,
                                 config_name: Optional[str] = None) -> EvaluationResult:
    if domain is not None:
        evaluation_results = [result for result in evaluation_results if result.domain == domain]
    if config_name is not None:
        evaluation_results = [result for result in evaluation_results if result.config_name == config_name]
    return EvaluationResults(
        levenshtein_distance_norm=sum([result.levenshtein_distance_norm for result in evaluation_results]) / len(evaluation_results),
        exact_match=sum([result.exact_match for result in evaluation_results]) / len(evaluation_results),
        missing_content=sum([result.missing_content for result in evaluation_results]) / len(evaluation_results),
        extra_content=sum([result.extra_content for result in evaluation_results]) / len(evaluation_results),
        domain=domain,
        config_name=config_name
    )


def list_domains(domains: Optional[list[str]] = None) -> list[str]:
    if domains is None:
        return os.listdir(EVALS_PATH)
    return [d for d in os.listdir(EVALS_PATH) if d in domains]


def eval_parser_generator(parser_generator: ParserGenerator, config_name: str = None, domains: list[str] = None) -> list[EvaluationResult]:
    evaluation_results = []
    for domain in list_domains(domains):
        url_prefix = URLPrefix.from_evals(domain)
        parser = parser_generator.generate_parser(url_prefix)
        for sample_url in url_prefix.validation_urls:
            parsed_content = parser.parse(sample_url.raw_content)
            if sample_url.label is not None:
                evaluation_result = sample_url.evaluate(parsed_content, config_name, domain)
                evaluation_results.append(evaluation_result)
            else:
                print(f"Sample URL: {sample_url.url}")
                print(f"Parsed content: {parsed_content}")
                print("---")
    return evaluation_results


def create_sample_urls(urls: List[str]) -> List[SampleURL]:
    """Create SampleURL objects from a list of URLs."""
    sample_urls = []
    
    for url in urls:
        print(f"Loading content from: {url}")
        try:
            sample_url = SampleURL.from_url(url)
            sample_urls.append(sample_url)
        except Exception as e:
            print(f"Error loading {url}: {e}")
            continue
    
    return sample_urls


def save_sample_urls(sample_urls: List[SampleURL], domain: str, validation: bool = False):
    """Save sample URLs to the appropriate directory structure."""
    for sample_url in sample_urls:
        try:
            saved_path = sample_url.save(domain, validation)
            print(f"Saved: {saved_path}")
        except Exception as e:
            print(f"Error saving {sample_url.url}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Parser evaluation CLI - manage domains, input URLs, and validation URLs"
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Setup command - create domain structure and save URLs
    setup_parser = subparsers.add_parser('add-evals', help='Add evals for a domain')
    setup_parser.add_argument('domain', help='Domain name (e.g., "databricks")')
    setup_parser.add_argument('--input-urls', nargs='+', required=True, 
                             help='List of input URLs to scrape and save')
    setup_parser.add_argument('--validation-urls', nargs='+', required=True,
                             help='List of validation URLs to scrape and save')
    
    # Evaluate configurations
    evaluate_parser = subparsers.add_parser('eval', help='Evaluate configs for all domains')
    evaluate_parser.add_argument('--config', nargs='+', default=[''],
                               help='Parser generator config file(s), use names of configs (without .yaml)')
    evaluate_parser.add_argument('--domain', nargs='+', default=None,
                               help='Domains to evaluate, if not provided, all domains will be evaluated')

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'add-evals':
        print(f"Setting up domain: {args.domain}")
        print(f"Input URLs: {args.input_urls}")
        print(f"Validation URLs: {args.validation_urls}")
        
        # Create input sample URLs
        print("\n=== Creating input sample URLs ===")
        input_samples = create_sample_urls(args.input_urls)
        save_sample_urls(input_samples, args.domain, validation=False)
        
        # Create validation sample URLs
        print("\n=== Creating validation sample URLs ===")
        validation_samples = create_sample_urls(args.validation_urls)
        save_sample_urls(validation_samples, args.domain, validation=True)
        
        print(f"\nSetup complete for domain: {args.domain}")
    
    elif args.command == 'eval':
        print(f"Evaluating configs for all domains")
        aggregated_evaluation_results = []
        evaluation_results = []
        for config_name in args.config:
            print(f"Evaluating config: {config_name}")
            parser_generator = ParserGenerator.from_config(config_name)
            config_evaluation_results = eval_parser_generator(parser_generator, config_name, args.domain)
            # config_aggregated_evaluation_results = aggregate_evaluation_results(config_evaluation_results, config_name=config_name)
            # aggregated_evaluation_results.append(config_aggregated_evaluation_results)
            evaluation_results.extend(config_evaluation_results)
        evaluation_run = EvaluationRun(results=evaluation_results, datetime_str=datetime.now().isoformat(), config_name=config_name)
        save(evaluation_run)
        # for domain in list_domains(args.domain):
        #     domain_aggregated_evaluation_results = aggregate_evaluation_results(evaluation_results, domain=domain)
        #     aggregated_evaluation_results.append(domain_aggregated_evaluation_results)
        # write_report(evaluation_results, aggregated_evaluation_results, "report.html")
        # print(f"Wrote report to report.html")
            
    elif args.command == 'generate':
        print(f"Generating parser for domain: {args.domain}")
        
        try:
            # Load URL prefix from evals
            url_prefix = URLPrefix.from_evals(args.domain)
            print(f"Loaded {len(url_prefix.sample_urls)} sample URLs")
            
            # Generate parser
            parser_generator = ParserGenerator.from_config(args.config)
            parser = parser_generator.generate_parser(url_prefix)
            
            print("Parser generated successfully!")
            
        except Exception as e:
            print(f"Error generating parser: {e}")
            sys.exit(1)
            
    elif args.command == 'test':
        print(f"Testing parser for domain: {args.domain}")
        
        try:
            # Load URL prefix from evals
            url_prefix = URLPrefix.from_evals(args.domain)
            print(f"Loaded {len(url_prefix.sample_urls)} sample URLs")
            
            # Generate parser
            parser_generator = ParserGenerator.from_config(args.config)
            parser = parser_generator.generate_parser(url_prefix)
            
            # Test on validation URLs
            print("\n=== Testing on validation URLs ===")
            # Note: You'll need to implement loading validation URLs from the domain structure
            
        except Exception as e:
            print(f"Error testing parser: {e}")
            sys.exit(1)


if __name__ == '__main__':
    main()
