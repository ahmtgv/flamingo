import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Types and typed Apollo hooks are generated from the SDL contract
 * (docs/flamingo_schema.graphql) plus the *.graphql operation documents that
 * live next to each feature. Re-run after any schema or operation change:
 *   npm run codegen
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: '../docs/flamingo_schema.graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    'src/entities/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        withHooks: true,
        // Enums as string-literal unions, so values compare directly to the
        // GraphQL spellings (e.g. ageBand === 'JUNIOR', role === 'STUDENT').
        enumsAsTypes: true,
        // Custom scalars -> TS types (the SDL declares DateTime + JSON).
        scalars: {
          DateTime: 'string',
          JSON: 'Record<string, unknown>',
        },
      },
    },
  },
};

export default config;
