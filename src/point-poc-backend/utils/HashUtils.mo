import SHA3 "mo:sha3";
import Text "mo:base/Text";
import AU "ArrayUtils";
import TU "TextUtils";
import Nat8 "mo:base/Nat8";
import Array "mo:base/Array";
import Nat "mo:base/Nat";

module {
    public func keccak(
        val: [Nat8],
        bits: Nat
    ): [Nat8] {
        let hash = SHA3.Keccak(bits);
        hash.update(val);
        return hash.finalize();
    };

    public func hashMessage(message: Text): Text {
        let prefix = "\u{0019}Ethereum Signed Message:\n";
        let prefixBytes = TU.encodeUtf8(prefix);
        let messageLength = TU.encodeUtf8(Nat.toText(Text.size(message)));
        let messageBytes = TU.encodeUtf8(message);
        let bytes = Array.append(prefixBytes, Array.append(messageLength, messageBytes));
        return AU.toText(keccak(bytes, 256));
    };
};