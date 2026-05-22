export type MobileBillingStatus = {
  nativeIapReady: false
  reason: string
  webBillingAvailable: false
}

export function getMobileBillingStatus(): MobileBillingStatus {
  return {
    nativeIapReady: false,
    webBillingAvailable: false,
    reason: 'Your account access is shown here. In-app upgrades are not available in this iOS version.',
  }
}
