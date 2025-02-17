import clsx from 'clsx'
import { ComponentPropsWithoutRef } from 'react'
import { useTranslation } from 'react-i18next'

import { LoadingData } from '@dao-dao/types'
import { USDC_DECIMALS, formatTime, toFixedDown } from '@dao-dao/utils'

import { Tooltip } from './Tooltip'

// Standardized display for token amounts, with support for displaying compact
// notation of numbers and providing tooltips with precise numbers when any
// abbreviation occurs.
//
// It automatically displays max 2 decimals when abbreviating larger values,
// since the abbreviation already implies an approximate is being displayed, and
// the token decimals no longer carry the same meaning in the abbreviated value.
//
// For example: 250,319,726.80401 $JUNO abbreviates to 250.31K $JUNO, which
// looks much better than 250.319726K $JUNO.
//
// Notes:
//
// The only token amounts we intentionally don't show with full decimals are
// USDC conversions (max 2) and ProfileHomeCard's unstaked and staked balances
// (max 2).

// Default maximum decimals to use in a USDC conversion.
const USDC_CONVERSION_DEFAULT_MAX_DECIMALS = 2
// Maximum decimals to use in a large compacted value.
const LARGE_COMPACT_MAX_DECIMALS = 2

export type TokenAmountDisplayProps = Omit<
  ComponentPropsWithoutRef<'p'>,
  'children'
> & {
  amount: number | LoadingData<number>
  prefix?: string
  suffix?: string
  // Max decimals to display.
  maxDecimals?: number
  // Don't show approximation indication (like a tilde).
  hideApprox?: boolean
  // Add to tooltip if present.
  dateFetched?: Date
} & ( // If not USDC conversion, require symbol and decimals.
    | {
        symbol: string
        // Full decimal precision of the value.
        decimals: number
        usdcConversion?: false
      }
    // If USDC conversion, disallow symbol and decimals.
    | {
        symbol?: never
        decimals?: never
        usdcConversion: true
      }
  )

export const TokenAmountDisplay = ({
  amount: _amount,
  decimals: _decimals,
  prefix,
  suffix,
  maxDecimals,
  hideApprox,
  dateFetched,
  symbol: _symbol,
  usdcConversion,
  ...props
}: TokenAmountDisplayProps) => {
  const { t } = useTranslation()

  const symbol = usdcConversion ? 'USDC' : _symbol
  const decimals = usdcConversion ? USDC_DECIMALS : _decimals

  // If loading, display pulsing ellipses.
  if (typeof _amount !== 'number' && 'loading' in _amount && _amount.loading) {
    return (
      <p {...props} className={clsx('animate-pulse', props.className)}>
        {t('format.token', {
          amount: '...',
          symbol,
        })}
      </p>
    )
  }

  // Extract amount from loaded value.
  const amount = typeof _amount === 'number' ? _amount : _amount.data

  const options: Intl.NumberFormatOptions & { roundingPriority: string } = {
    maximumFractionDigits: decimals,
    // Safari (and potentially other non-Chrome browsers) uses only 1 decimal
    // when notation=compact. roundingPriority=morePrecision tells the formatter
    // to resolve decimal contraint conflicts with the result with greater
    // precision.
    roundingPriority: 'morePrecision',
  }

  const maxCompactDecimals =
    maxDecimals ??
    (usdcConversion ? USDC_CONVERSION_DEFAULT_MAX_DECIMALS : decimals)
  const compactOptions: Intl.NumberFormatOptions & {
    roundingPriority: string
  } = {
    ...options,
    notation: 'compact',
    maximumFractionDigits: maxCompactDecimals,
    // notation=compact seems to set maximumSignificantDigits if undefined.
    // Because we are rounding toward more precision above, set
    // maximumSignificantDigits to 1 so that notation=compact does not
    // override it and display extra decimals in case maximumFractionDigits is
    // less. This appears to work fine on both Chrome and Safari, which is
    // good enough for now. This is a crazy hack.
    maximumSignificantDigits: 1,
  }

  const full = toFixedDown(amount, decimals).toLocaleString(undefined, options)
  // Abbreviated number. Example: 1,000,000 => 1M, or 1.2345 => 1.23.
  let compact = toFixedDown(amount, maxCompactDecimals).toLocaleString(
    undefined,
    compactOptions
  )

  const largeNumber = amount >= 1000

  // If this is a large number that is compacted, and maxDecimals is not being
  // overridden, use fewer decimals because compact notation looks bad with too
  // many decimals. We first needed to use the same decimals to compare and see
  // if compact had any effect. If compact changed nothing, we want to keep the
  // original decimals.
  if (largeNumber && full !== compact && maxDecimals === undefined) {
    compact = toFixedDown(amount, LARGE_COMPACT_MAX_DECIMALS).toLocaleString(
      undefined,
      {
        ...compactOptions,
        maximumFractionDigits: LARGE_COMPACT_MAX_DECIMALS,
      }
    )
  }

  const wasCompacted = full !== compact

  // Display compact.
  const display = t(
    // If compact is different from full and not a large number, display
    // approximation indication (e.g. ~15.34 when the full value is 15.344913).
    // When large, the compact notation (e.g. 1.52K or 23.5M) is enough to
    // indicate that there is missing info, and we don't need the explicit
    // approximation indication.
    wasCompacted && !largeNumber && !hideApprox
      ? 'format.tokenApprox'
      : 'format.token',
    {
      amount: compact,
      symbol,
    }
  )

  return (
    <Tooltip
      title={
        (wasCompacted || dateFetched) && (
          <>
            {/* Show full in tooltip if different from compact. */}
            {wasCompacted &&
              t('format.token', {
                amount: full,
                symbol,
              })}
            {wasCompacted && dateFetched && <br />}
            {/* Show date fetched if present. */}
            {dateFetched && (
              <span className="caption-text">
                {t('info.fetchedAtTime', {
                  time: formatTime(dateFetched),
                })}
              </span>
            )}
          </>
        )
      }
    >
      <p {...props}>
        {prefix}
        {display}
        {suffix}
      </p>
    </Tooltip>
  )
}
