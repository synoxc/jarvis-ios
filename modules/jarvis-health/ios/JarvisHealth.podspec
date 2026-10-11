Pod::Spec.new do |s|
  s.name           = 'JarvisHealth'
  s.version        = '1.0.0'
  s.summary        = 'Leitura de dados de atividade fisica do HealthKit.'
  s.author         = 'JARVIS'
  s.homepage       = 'https://example.com/jarvis-health'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.source_files   = '*.{h,m,mm,swift}'
  s.frameworks     = 'HealthKit'
  s.dependency 'ExpoModulesCore'
end
