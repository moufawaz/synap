source 'https://rubygems.org'

# Fastlane and plugins
gem 'fastlane', '~> 2.220'

# iOS
gem 'fastlane-plugin-firebase_app_distribution', group: :optional

plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)
