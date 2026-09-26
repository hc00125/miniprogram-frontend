/** Local build candidate support, not a server response or transaction authorization.
 * Backend quote.can_submit, qualification and the actual payment snapshot remain mandatory.
 * Gift transactions still depend on independent live server capabilities.
 */
export const commerceRelease = Object.freeze({
  contract: 'surcharge-v2-candidate',
  orderSurchargeReadSupported: false,
  // Only publish after the parent verifies the live backend release and readiness.
  orderSurchargeQuoteSupported: true,
  // Implemented available-orders v2 DTO is optional; older releases omit it and render the unchanged card.
  orderSurchargeHallContractVerified: true,
})
