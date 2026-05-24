const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'

interface Props {
  edge: Record<string, unknown>
  entityId: number
  hasCorrected: boolean
  onFlag: () => void
}

export function EdgeCard({ edge, entityId, hasCorrected, onFlag }: Props) {
  const isSource = (edge.source_id as number) === entityId
  const direction = isSource ? '→' : '←'
  const otherName = edge.other_name as string
  const edgeType = ((edge.edge_type as string) || '').replace(/_/g, ' ')
  const role = edge.role as string | null
  const evidence = edge.evidence as string | null

  return (
    <div
      className={`p-2 rounded border flex items-start gap-3 ${hasCorrected ? 'border-amber-300 bg-amber-50' : 'border-[#eee]'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[13px] text-[#1a1a1a]">
          {direction} {otherName}
          <span className="text-[#888] ml-1">
            ({edgeType}
            {role ? `, ${role}` : ''})
          </span>
        </div>
        {evidence && (
          <p
            className="text-[12px] text-[#555] mt-1 pl-3 border-l-2 border-[#eee] italic"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            {evidence}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {hasCorrected ? (
          <span className="font-mono text-[10px] text-amber-600 uppercase">Corrected</span>
        ) : (
          <button
            onClick={onFlag}
            className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600`}
          >
            Flag
          </button>
        )}
      </div>
    </div>
  )
}
