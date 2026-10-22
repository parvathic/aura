import CommonCrypto
import ExpoModulesCore
import Foundation

// Native security helpers for Aura:
// - Data Protection "complete": database files are encrypted and unreadable while the phone is locked.
// - Backup exclusion: keeps the database folder out of iCloud / computer backups when the user chooses.
// - PBKDF2-SHA256: password stretching for encrypted backups (far faster than doing it in JavaScript).
public class AuraSecurityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AuraSecurity")

    // Apply "complete" protection to a folder and everything already in it.
    // New files created inside the folder inherit the folder's protection.
    Function("protectDirectory") { (path: String) in
      let fm = FileManager.default
      let attrs: [FileAttributeKey: Any] = [.protectionKey: FileProtectionType.complete]
      try fm.setAttributes(attrs, ofItemAtPath: path)
      for name in try fm.contentsOfDirectory(atPath: path) {
        try fm.setAttributes(attrs, ofItemAtPath: (path as NSString).appendingPathComponent(name))
      }
    }

    // The protection class of a file, e.g. "NSFileProtectionComplete" (for checking it worked).
    Function("getProtection") { (path: String) -> String? in
      let attrs = try FileManager.default.attributesOfItem(atPath: path)
      return (attrs[.protectionKey] as? FileProtectionType)?.rawValue
    }

    Function("setExcludedFromBackup") { (path: String, excluded: Bool) in
      var url = URL(fileURLWithPath: path)
      var values = URLResourceValues()
      values.isExcludedFromBackup = excluded
      try url.setResourceValues(values)
    }

    Function("isExcludedFromBackup") { (path: String) -> Bool in
      let values = try URL(fileURLWithPath: path).resourceValues(forKeys: [.isExcludedFromBackupKey])
      return values.isExcludedFromBackup ?? false
    }

    // Derive a 32-byte key from a password. Runs off the JavaScript thread.
    AsyncFunction("pbkdf2Sha256") { (password: String, saltBase64: String, iterations: Int) -> String in
      // Same bounds the JavaScript side enforces; also keeps UInt32(iterations) from trapping
      guard let salt = Data(base64Encoded: saltBase64), (1...10_000_000).contains(iterations) else {
        throw Exception(name: "InvalidArgument", description: "Bad salt or iteration count")
      }
      let passwordBytes = Array(password.utf8)
      var key = [UInt8](repeating: 0, count: 32)
      let status = salt.withUnsafeBytes { saltPtr in
        CCKeyDerivationPBKDF(
          CCPBKDFAlgorithm(kCCPBKDF2),
          passwordBytes.map { CChar(bitPattern: $0) }, passwordBytes.count,
          saltPtr.bindMemory(to: UInt8.self).baseAddress, salt.count,
          CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
          UInt32(iterations),
          &key, key.count
        )
      }
      guard status == kCCSuccess else {
        throw Exception(name: "DerivationFailed", description: "PBKDF2 failed with status \(status)")
      }
      return Data(key).base64EncodedString()
    }
  }
}
