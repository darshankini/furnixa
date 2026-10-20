import { formatMoney } from '../../utils/format'

interface Props {
  total: string | number
  paid: string | number
  balance: string | number
  totalLabel?: string
}

/** Total / Received / Balance due tiles */
export function MoneyTiles({ total, paid, balance, totalLabel = 'Total amount' }: Props) {
  const settled = Number(total) > 0 && Number(balance) <= 0
  return (
    <div className="money-tiles">
      <div className="money-tile">
        <div className="money-tile-label">{totalLabel}</div>
        <div className="money-tile-value">{formatMoney(total)}</div>
      </div>
      <div className="money-tile">
        <div className="money-tile-label">Received</div>
        <div className="money-tile-value">{formatMoney(paid)}</div>
      </div>
      <div className={`money-tile ${settled ? 'settled' : 'balance'}`}>
        <div className="money-tile-label">Balance due</div>
        <div className="money-tile-value">{settled ? 'Fully paid' : formatMoney(balance)}</div>
      </div>
    </div>
  )
}
