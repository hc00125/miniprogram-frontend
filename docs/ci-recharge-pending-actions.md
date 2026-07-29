# Recharge pending-order recovery

- Recharge creation obtains a fresh `wx.login` code inside the wallet API.
- WeChat error 40163 triggers distinct-code retry, capped at three backend attempts.
- Paying recharge records can be resumed or cancelled.
- Expired paying records are reconciled and cleared from the recharge page.
