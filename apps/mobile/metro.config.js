const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const supabaseCjsEntry = require.resolve('@supabase/supabase-js/dist/index.cjs')

config.transformer = {
  ...config.transformer,
  unstable_transformProfile: 'hermes-stable',
}

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver = {
  ...config.resolver,
  resolveRequest(context, moduleName, platform) {
    if (moduleName === '@supabase/supabase-js') {
      return {
        type: 'sourceFile',
        filePath: supabaseCjsEntry,
      }
    }

    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform)
    }

    return context.resolveRequest(context, moduleName, platform)
  },
}

module.exports = config
