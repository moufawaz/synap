'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Clipboard, Download, Loader2, RefreshCw, Share2, ShoppingBasket, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

type GroceryItem = {
  id: string
  name: string
  category: string
  quantity: string
  sources: string[]
}

type GroceryGroup = {
  category: string
  items: GroceryItem[]
}

const CHECKED_KEY = 'synap_grocery_checked_v1'

export default function GroceryListPage() {
  const [groups, setGroups] = useState<GroceryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      setChecked(new Set(JSON.parse(localStorage.getItem(CHECKED_KEY) || '[]')))
    } catch {}
    loadList()
  }, [])

  async function loadList() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/grocery-list')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not build grocery list')
      setGroups(data.groups || [])
    } catch (err: any) {
      setError(err?.message || 'Could not build grocery list')
    } finally {
      setLoading(false)
    }
  }

  const allItems = useMemo(() => groups.flatMap(group => group.items), [groups])
  const checkedCount = allItems.filter(item => checked.has(item.id)).length
  const progress = allItems.length ? Math.round((checkedCount / allItems.length) * 100) : 0

  function toggle(id: string) {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
    localStorage.setItem(CHECKED_KEY, JSON.stringify([...next]))
  }

  function clearChecked() {
    setChecked(new Set())
    localStorage.removeItem(CHECKED_KEY)
  }

  function listText() {
    return groups.map(group => {
      const rows = group.items.map(item => `${checked.has(item.id) ? '[x]' : '[ ]'} ${item.name} - ${item.quantity}`)
      return `${group.category}\n${rows.join('\n')}`
    }).join('\n\n')
  }

  async function copyList() {
    const text = `SYNAP Weekly Grocery List\n\n${listText()}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SYNAP Weekly Grocery List', text })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: '#BB5CF6' }} />
          <p className="font-heading text-sm" style={{ color: '#64748B' }}>Building your grocery list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#10B981', letterSpacing: '0.14em' }}>WEEKLY GROCERY BUILDER</p>
          <h1 className="font-heading font-bold text-2xl text-white">Smart Grocery List</h1>
          <p className="font-heading text-sm mt-1 max-w-xl" style={{ color: '#64748B' }}>
            Built from your active diet plan. Global-first by default, with local foods only when your plan includes them.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadList}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-heading text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={copyList}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-heading text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="glass-card p-8 text-center">
          <ShoppingBasket size={34} className="mx-auto mb-3" style={{ color: '#64748B' }} />
          <p className="font-heading font-bold text-white mb-2">{error}</p>
          <p className="font-heading text-sm mb-5" style={{ color: '#64748B' }}>Generate a diet plan first, then Ion can turn it into a shopping list.</p>
          <Link href="/plan" className="btn-primary text-sm inline-flex">
            Open plan
          </Link>
        </div>
      ) : (
        <>
          <div className="glass-card p-5 mb-5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: '#10B981' }} />
                <p className="font-heading font-bold text-sm text-white">Shopping Progress</p>
              </div>
              <p className="font-heading text-sm font-bold" style={{ color: '#10B981' }}>{checkedCount}/{allItems.length}</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#10B981' }} />
            </div>
            {checkedCount > 0 && (
              <button onClick={clearChecked} className="mt-3 font-heading text-xs font-bold" style={{ color: '#64748B' }}>
                Clear checked items
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {groups.map(group => (
              <section key={group.category} className="glass-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <ShoppingBasket size={16} style={{ color: '#10B981' }} />
                    <h2 className="font-heading text-sm font-bold text-white">{group.category}</h2>
                  </div>
                  <span className="font-heading text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                    {group.items.length}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {group.items.map(item => {
                    const done = checked.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all"
                        style={{ opacity: done ? 0.55 : 1 }}
                      >
                        <span
                          className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: done ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${done ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.1)'}`,
                            color: '#10B981',
                          }}
                        >
                          {done && <Check size={13} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-heading text-sm font-bold text-white">{item.name}</span>
                          <span className="block font-heading text-xs mt-1" style={{ color: '#64748B' }}>
                            Used in {item.sources.slice(0, 3).join(', ')}{item.sources.length > 3 ? ` +${item.sources.length - 3}` : ''}
                          </span>
                        </span>
                        <span className="font-heading text-sm font-bold shrink-0" style={{ color: '#10B981' }}>{item.quantity}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={copyList}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-xs font-bold"
              style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)', color: '#D88BFF' }}
            >
              <Clipboard size={14} /> Copy text list
            </button>
            <button
              onClick={() => {
                const blob = new Blob([`SYNAP Weekly Grocery List\n\n${listText()}`], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'synap-grocery-list.txt'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
            >
              <Download size={14} /> Download
            </button>
          </div>
        </>
      )}
    </div>
  )
}
