import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HowItWorks } from '../components/HowItWorks'
import { Navigation } from '../components/Navigation'
import { ContributeForm } from './ContributeForm'
import { IS_IFRAME } from '../lib/iframe'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  return (
    <QueryClientProvider client={queryClient}>
      <HowItWorks forceOpen={showHowItWorks} onDismiss={() => setShowHowItWorks(false)} />
      <Navigation />
      <main className="max-w-[800px] mx-auto px-6 pt-16 pb-12 font-serif">
        <header className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#888] mb-2">Mapping AI — Contribute</p>
          <h1 className="text-3xl italic mb-3" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
            Add to the Map
          </h1>
          <p className="text-[15px] leading-relaxed text-[#555]">
            Help us build a comprehensive map of the AI policy landscape. Submit new entries or update existing ones
            with corrections, additional context, or new perspectives.
          </p>
        </header>

        {/* Disclaimer bar with How It Works button */}
        <div className="mb-8 px-4 py-3 bg-[#f8f8f8] border border-[#e0e0e0] rounded text-[14px] leading-relaxed text-[#444]">
          Anyone with knowledge of the U.S. AI policy landscape can contribute. You can add a completely new person,
          organization, or resource, or search for an existing entry and submit updates, corrections, or additional
          information. All submissions are reviewed before publication.{' '}
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="inline font-mono text-[11px] uppercase tracking-wider text-[#2563eb] hover:text-[#1a1a1a] cursor-pointer bg-transparent border-none p-0 ml-1"
          >
            How it works
          </button>
        </div>

        <ContributeForm className="mb-12" />

        {!IS_IFRAME && (
          <a
            href="/map"
            className="fixed bottom-6 right-6 px-4 py-2 font-mono text-[11px] uppercase tracking-wider bg-[#1a1a1a] text-white rounded shadow-lg hover:bg-[#333] transition-colors no-underline z-50"
          >
            See Map &rarr;
          </a>
        )}
      </main>
    </QueryClientProvider>
  )
}
