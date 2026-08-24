// Barrel du chemin PRODUIT. `buildPortfolio` n'y figure plus : l'optimiseur est
// isolé sous `./legacy` et ne doit pas être atteignable par un import de confort.
export * from "./types";
export { computeMetrics } from "./metrics";
export { sumWeights, allocatedShare, unallocatedShare, isOverAllocated } from "./weights";
export {
  classifyDataQuality,
  anchorLowConfidenceReturns,
  classCorrelationPrior,
  covarianceFallback,
  FULL_CONFIDENCE_MIN_OBS,
  PARTIAL_CONFIDENCE_MIN_OBS,
} from "./data-quality";
export { buildExplanation, diversificationScore10 } from "./explanation";
