import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { getDeviceId } from './storage/deviceId'
import { createNewBunch, fetchClicks, fetchHistory, getOrCreateActiveBunch, toggleBerry, type GrapeBunch, type GrapeClick } from './services/grapes'
import { supabaseConfigured } from './lib/supabaseClient'

function App() {
  const deviceId = useMemo(() => getDeviceId(), [])
  const [bunch, setBunch] = useState<GrapeBunch | null>(null)
  const [history, setHistory] = useState<GrapeBunch[]>([])
  const [clicks, setClicks] = useState<GrapeClick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!supabaseConfigured) {
        setLoading(false)
        return
      }
      try {
        const active = await getOrCreateActiveBunch(deviceId)
        const hist = await fetchHistory(deviceId)
        const logs = await fetchClicks(active.id)
        if (!mounted) return
        setBunch(active)
        setHistory(hist)
        setClicks(logs)
      } catch (err: any) {
        setError(err?.message ?? '로딩 중 오류가 발생했어요')
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [deviceId])

  async function handleBerryClickAt(position: number) {
    if (!bunch) return
    setError(null)
    try {
      const isFilled = clicks.some((c) => c.position === position)
      const note = isFilled ? undefined : (window.prompt('무엇을 잘했나요? (메모는 선택사항)') || undefined)
      const updated = await toggleBerry(bunch, position, note)
      setBunch(updated)
      const logs = await fetchClicks(updated.id)
      setClicks(logs)
      if (updated.completed_at) {
        const hist = await fetchHistory(deviceId)
        setHistory(hist)
        const fresh = await createNewBunch(deviceId)
        setBunch(fresh)
        setClicks([])
      }
    } catch (err: any) {
      setError(err?.message ?? '저장 중 오류가 발생했어요')
    }
  }

  const filled = clicks.length
  const total = bunch?.total_berries ?? 0
  const remaining = Math.max(total - filled, 0)

  function buildRows(totalGrapes: number): number[] {
    const pattern = [3, 4, 5, 6, 5, 4, 3] // up to 30 grapes
    const rows: number[] = []
    let left = totalGrapes
    for (const n of pattern) {
      if (left <= 0) break
      const use = Math.min(n, left)
      rows.push(use)
      left -= use
    }
    return rows
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>포도알 칭찬스티커</h1>
      </header>

      {!supabaseConfigured && (
        <div className="panel error">
          Supabase 설정이 필요해요. 프로젝트 루트에 <code>.env</code> 파일을 만들고
          <pre style={{ whiteSpace: 'pre-wrap' }}>VITE_SUPABASE_URL=...&#92;nVITE_SUPABASE_ANON_KEY=...</pre>
          값을 채워주세요.
        </div>
      )}

      {loading && <div className="panel">불러오는 중...</div>}
      {error && <div className="panel error">{error}</div>}

      {bunch && (
        <div className="bunch-and-table">
          <div className="bunch-section">
            <div className="progress">
              <span>
                {filled} / {total}
              </span>
              <small>잘한 일을 했을 때 포도알을 눌러주세요</small>
            </div>

            <div className="grape-bunch" role="group" aria-label="grape bunch">
              <div className="vine" aria-hidden>
                <span className="stem" />
                <span className="leaf" />
              </div>
              {(() => {
                let globalIndex = 0
                return buildRows(total).map((count, rowIdx) => (
                  <div className="grape-row" key={`row-${rowIdx}`}>
                    {Array.from({ length: count }).map((_, i) => {
                      const idx = globalIndex++
                      const position = idx + 1
                      const filledHere = clicks.some((c) => c.position === position)
                      return (
                        <button
                          type="button"
                          key={`g-${rowIdx}-${i}`}
                          className={filledHere ? 'grape filled' : 'grape'}
                          onClick={() => handleBerryClickAt(position)}
                          aria-pressed={filledHere}
                          title={filledHere ? `${position}번째 포도알 취소` : `${position}번째 포도알 채우기`}
                        />
                      )
                    })}
                  </div>
                ))
              })()}
            </div>
            <div className="hint">포도송이를 눌러 포도알을 채워요. 남은 포도알 {remaining}개</div>
          </div>

          <div className="clicks-table-wrap">
            <h3>기록</h3>
            <table className="clicks-table">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>날짜</th>
                  <th>잘한 일</th>
                </tr>
              </thead>
              <tbody>
                {clicks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">아직 기록이 없어요</td>
                  </tr>
                ) : (
                  clicks.map((c) => (
                    <tr key={c.id}>
                      <td>{c.position}</td>
                      <td>{new Date(c.clicked_at).toLocaleString()}</td>
                      <td>{c.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="history-section">
        <h2>완성한 포도</h2>
        {history.length === 0 && <div className="panel">아직 완성한 포도가 없어요</div>}
        <ul className="history-list">
          {history.map((h) => (
            <li key={h.id} className="history-item">
              <span className="dot" />
              <span className="meta">
                <strong>{h.total_berries}개</strong> 포도알 ·
                <span> {new Date(h.completed_at || h.created_at).toLocaleString()}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="app-footer">보라보라한 하루 되세요 🍇</footer>
    </div>
  )
}

export default App
