import Ecmult "mo:libsecp256k1/core/ecmult";
import PreG "pre_g";
import Prec "prec";

module {
    public class Context() {
        public let ecGenCtx = Ecmult.ECMultGenContext(?Ecmult.loadPrec(Prec.prec));
        public let ecCtx = Ecmult.ECMultContext(?Ecmult.loadPreG(PreG.pre_g));
    };
}