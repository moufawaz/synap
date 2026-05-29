Pod::Spec.new do |s|
  s.name           = 'SynapLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'SYNAP workout timer Live Activity bridge'
  s.description    = 'Starts, updates, and ends the workout-timer Live Activity (ActivityKit).'
  s.author         = 'SYNAP'
  s.homepage       = 'https://synap.fit'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
