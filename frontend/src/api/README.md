# Frontend API Helper Functions

This directory contains frontend helper functions for calling the backend API endpoints. The API helpers are organized into several modules for better maintainability and reusability.

## Structure

```
src/
├── api/
│   ├── client.ts          # Base API client with error handling
│   ├── evaluation.ts      # Evaluation-specific API functions
│   ├── data.ts           # Data-specific API functions
│   └── index.ts          # Exports all API modules
├── hooks/
│   ├── useApi.ts         # Generic API hooks
│   ├── useEvaluation.ts  # Evaluation-specific hooks
│   ├── useData.ts        # Data-specific hooks
│   └── index.ts          # Exports all hooks
└── types/
    └── api.ts            # TypeScript type definitions
```

## API Client

The `ApiClient` class provides a base for all API calls with built-in error handling and request configuration.

### Features

- Automatic JSON serialization/deserialization
- Error handling with custom `ApiError` class
- Configurable base URL (via `VITE_API_BASE_URL` environment variable)
- Support for all HTTP methods (GET, POST, PUT, DELETE)

### Usage

```typescript
import { apiClient } from './api/client';

// GET request
const data = await apiClient.get<MyType>('/api/endpoint');

// POST request
const result = await apiClient.post<MyType>('/api/endpoint', { data: 'value' });
```

## API Functions

### Evaluation API (`api/evaluation.ts`)

Functions for working with evaluation runs and results:

```typescript
import { evaluationApi } from './api/evaluation';

// Get all evaluation runs
const runs = await evaluationApi.getEvaluationRuns();

// Get specific evaluation run
const run = await evaluationApi.getEvaluationRun('run-id');

// Get evaluation statistics
const stats = await evaluationApi.getEvaluationStatistics();
```

### Data API (`api/data.ts`)

Functions for working with URL prefixes, sample URLs, and related data:

```typescript
import { dataApi } from './api/data';

// Get all domains
const domains = await dataApi.getDomains();

// Get URL prefixes with their URLs
const prefixes = await dataApi.getUrlPrefixes();

// Get URLs for a specific prefix
const urls = await dataApi.getUrlsByPrefix('example.com');

// Get detailed URL information
const urlDetails = await dataApi.getUrlDetails('https://example.com/page');
```

## React Hooks

### Generic API Hooks (`hooks/useApi.ts`)

#### `useApi<T>(apiCall, dependencies)`

A generic hook for API calls with automatic loading and error states:

```typescript
import { useApi } from './hooks/useApi';
import { evaluationApi } from './api/evaluation';

function MyComponent() {
  const { data, loading, error } = useApi(() => evaluationApi.getEvaluationRuns());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Render data */}</div>;
}
```

#### `useApiCallback<T>(apiCall)`

A hook for manually triggered API calls (for parameterless API functions):

```typescript
import { useApiCallback } from './hooks/useApi';
import { evaluationApi } from './api/evaluation';

function MyComponent() {
  const { data, loading, error, execute, reset } = useApiCallback(
    () => evaluationApi.getEvaluationRuns()
  );

  const handleClick = () => {
    execute();
  };

  return (
    <div>
      <button onClick={handleClick}>Load Data</button>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.toString()}</div>}
      {data && <div>{/* Render data */}</div>}
    </div>
  );
}
```

### Evaluation Hooks (`hooks/useEvaluation.ts`)

Specialized hooks for evaluation data:

```typescript
import { 
  useEvaluationRuns,
  useEvaluationRun,
  useEvaluationStatistics,
  useLatestEvaluationRun
} from './hooks/useEvaluation';

function EvaluationComponent() {
  const { data: runs, loading, error } = useEvaluationRuns();
  const { data: stats } = useEvaluationStatistics();
  const { data: latestRun } = useLatestEvaluationRun();

  // Use the data...
}
```

### Data Hooks (`hooks/useData.ts`)

Specialized hooks for data management:

```typescript
import { 
  useUrlPrefixes,
  useUrlsByPrefix,
  useUrlDetails,
  usePrefixStatistics,
  useUrlSearch
} from './hooks/useData';

function DataComponent() {
  const { data: prefixes } = useUrlPrefixes();
  const { data: urls } = useUrlsByPrefix('example.com');
  const { data: urlDetails } = useUrlDetails('https://example.com/page');
  const { data: stats } = usePrefixStatistics('example.com');
  const { data: searchResults } = useUrlSearch('example');

  // Use the data...
}
```

## Type Definitions

All API types are defined in `types/api.ts` and match the backend data models:

```typescript
import type { 
  EvaluationRun, 
  EvaluationResult, 
  URLPrefix, 
  SampleURL,
  ApiErrorResponse 
} from './types/api';
```

## Error Handling

The API client provides comprehensive error handling:

```typescript
import { ApiError } from './api/client';

try {
  const data = await apiClient.get('/api/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Details:', error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Environment Configuration

Set the API base URL using environment variables:

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
```

## Example Usage

Here's a complete example of using the API helpers in a React component:

```typescript
import React from 'react';
import { useUrlPrefixes, useEvaluationStatistics } from './hooks';

function DataOverview() {
  const { data: prefixes, loading: prefixesLoading, error: prefixesError } = useUrlPrefixes();
  const { data: stats, loading: statsLoading, error: statsError } = useEvaluationStatistics();

  if (prefixesLoading || statsLoading) {
    return <div>Loading...</div>;
  }

  if (prefixesError || statsError) {
    return <div>Error: {prefixesError?.message || statsError?.message}</div>;
  }

  return (
    <div>
      <h2>Data Overview</h2>
      {stats && (
        <div>
          <p>Total Runs: {stats.totalRuns}</p>
          <p>Total Results: {stats.totalResults}</p>
          <p>Average Accuracy: {(stats.averageAccuracy * 100).toFixed(1)}%</p>
        </div>
      )}
      {prefixes && (
        <div>
          <h3>URL Prefixes</h3>
          {prefixes.map(prefix => (
            <div key={prefix.prefix}>
              <h4>{prefix.prefix}</h4>
              <p>{prefix.sample_urls.length} URLs</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DataOverview;
```

## Best Practices

1. **Use hooks for data fetching**: Prefer the provided hooks over direct API calls in components
2. **Handle loading and error states**: Always check for loading and error states in your components
3. **Type safety**: Use the provided TypeScript types for better development experience
4. **Error boundaries**: Consider using React error boundaries for better error handling
5. **Caching**: The hooks automatically handle caching through React's state management
6. **Dependencies**: Be careful with dependency arrays in `useApi` to avoid unnecessary re-fetches
