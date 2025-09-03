// API Types based on backend data models

export interface EvaluationResult {
  abs_levenshtein_distance_norm: number;
  exact_match: boolean;
  missing_content: boolean;
  extra_content: boolean;
  config_name: string;
  domain: string;
  url: string;
  expected_content: string;
  parsed_content: string;
}

export interface EvaluationRun {
  results: EvaluationResult[];
  datetime_str: string;
  id: string;
}

export interface EvaluationResults {
  abs_levenshtein_distance_norm: number;
  exact_match: number;
  missing_content: number;
  extra_content: number;
  domain?: string;
  config_name?: string;
}

export interface ValidationLabel {
  content: string;
}

export interface SampleURL {
  url: string;
  raw_content?: string;
  label?: ValidationLabel;
}

export interface URL {
  url: string;
  prefix?: string;
  raw_content?: string;
  parsed_content?: string;
  id: string;
}

export interface ParserParameters {
  root: string[];
  keep: string[];
  drop: string[];
  unwrap: string[];
}

export interface ParserConfig {
  parameters: ParserParameters;
  prefix_name: string;
  id: string;
}

export interface URLPrefix {
  prefix: string;
  sample_urls: SampleURL[];
  validation_urls?: SampleURL[];
  parser_config?: ParserConfig;
}

export interface URLPrefixWithUrls {
  url_prefix: URLPrefix;
  all_urls: string[];
  url_count: number;
}

export interface ParserGeneratorConfig {
  openai_model: string;
  reasoning_level: string;
  instructions_prompt: string;
  input_prompt_template: string;
  error_prompt?: string;
  reflection_prompt?: string;
}

export interface Config {
  config_name: string;
  openai_model: string;
  reasoning_level: string;
  instructions_prompt: string;
  input_prompt_template: string;
  error_prompt?: string;
  reflection_prompt?: string;
  is_production: boolean;
}

// API Response types
export interface ApiErrorResponse {
  error: string;
  detail?: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: import('../api/client').ApiError;
  loading: boolean;
}
