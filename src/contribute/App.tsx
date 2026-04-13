import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PasswordGate } from '../components/PasswordGate'
import { HowItWorks } from '../components/HowItWorks'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PasswordGate>
        <HowItWorks />
        <div id="contribute-form-root">
          {/* ContributeForm will be rendered here in Unit 11 */}
        </div>
      </PasswordGate>
    </QueryClientProvider>
  )
}
