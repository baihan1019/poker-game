import React, { useCallback, useRef, useEffect } from 'react'
import { sortCards } from '../game/Card'

/**
 * 手牌组件
 *
 * 支持：
 * - 点击选牌/取消
 * - 金色呼吸灯（轮到你了）
 * - 抖动动画（出牌不合法）
 * - 触摸滑动抗干扰
 * - 键盘无障碍
 *
 * @param {Array} cards
 * @param {Set} selected
 * @param {Function} onToggleCard
 * @param {boolean} disabled
 * @param {boolean} glow - 是否显示金色呼吸灯
 * @param {number} shakeKey - 变化时触发抖动动画
 */
export default function HandCards({ cards, selected, onToggleCard, disabled, glow, shakeKey }) {
  const sorted = sortCards(cards)
  const containerRef = useRef(null)
  const touchStart = useRef({ x: 0, y: 0 })
  const isSwiping = useRef(false)

  const handleTouchStart = useCallback((e) => {
    if (disabled) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
    isSwiping.current = false
  }, [disabled])

  const handleTouchMove = useCallback((e) => {
    if (disabled) return
    const t = e.touches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) isSwiping.current = true
  }, [disabled])

  const handleTouchEnd = useCallback((e) => {
    if (disabled || isSwiping.current) return
    // 阻止后续 click 事件触发，避免手机上点一次牌触发两次 toggle
    e.preventDefault()
    const touch = e.changedTouches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const cardEl = el?.closest('[data-card-id]')
    if (cardEl) onToggleCard(cardEl.getAttribute('data-card-id'))
  }, [disabled, onToggleCard])

  return (
    <div
      className="hand-cards"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {sorted.map((card, index) => {
        const isSelected = selected.has(card.id)
        const isRed = card.color === 'red'
        return (
          <div
            key={card.id}
            data-card-id={card.id}
            className={[
              'card',
              isSelected ? 'selected' : '',
              isRed ? 'red' : '',
              disabled ? 'disabled' : '',
              glow && !isSelected && !disabled ? 'glow' : '',
              shakeKey > 0 ? 'shake' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => !disabled && onToggleCard(card.id)}
            style={{ zIndex: isSelected ? 10 : index }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${card.display}${isSelected ? '（已选中）' : ''}`}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onToggleCard(card.id)
              }
            }}
          >
            <span className="card-rank">
              {card.rank === 'SJ' ? '小' : card.rank === 'BJ' ? '大' : card.rank}
            </span>
            {card.suit ? (
              <span className="card-suit">{card.suit}</span>
            ) : (
              <span className="card-suit" style={{fontSize:'0.6rem'}}>王</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
