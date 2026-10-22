// Raises every CocoaPods target to a minimum iOS version that current Xcode supports.
// Some libraries (e.g. react-native-svg) still declare iOS 12.4, which Xcode 27 rejects.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '# aura: pod deployment target';

module.exports = function withPodDeploymentTarget(config, { target = '15.1' } = {}) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) =>
            `${match}    ${MARKER}\n` +
            `    installer.pods_project.targets.each do |t|\n` +
            `      t.build_configurations.each do |c|\n` +
            `        if Gem::Version.new(c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '0') < Gem::Version.new('${target}')\n` +
            `          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${target}'\n` +
            `        end\n` +
            `      end\n` +
            `    end\n`,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
