source 'https://rubygems.org'

# Fastlane and plugins
gem 'fastlane', '~> 2.220'
gem 'cocoapods', '~> 1.16'

# Fastlane loads ALL default actions at startup, including a Google Play action
# whose dependency chain (google-apis-core → representable) needs multi_json.
# Without a committed lock, bundler can resolve a set where multi_json isn't
# pulled in, crashing fastlane with "multi_json is not part of the bundle".
# Pin it explicitly so every build has it.
gem 'multi_json'

# iOS
gem 'fastlane-plugin-firebase_app_distribution', group: :optional

plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)
