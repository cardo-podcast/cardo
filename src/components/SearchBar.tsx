import { useEffect, useRef, useState, useTransition } from 'react'
import { searchPodcast } from '../engines/search/base'
import { EpisodeData, PodcastData } from '..'
import PodcastCard from './PodcastCard'
import { useTranslation } from 'react-i18next'
import { arrowLeft, arrowRight, sync } from '../Icons'
import { useLocation, useNavigate } from 'react-router-dom'
import EpisodeCard from './EpisodeCard'
import { useDB } from '../ContextProviders'
import { useSettings } from '../engines/Settings'

function SearchBar() {
  const [results, setResults] = useState<PodcastData[] | EpisodeData[]>([])
  const {
    subscriptionsEpisodes,
    subscriptions: { subscriptions },
  } = useDB()
  const [searchMode, setSearchMode_] = useState<'subscriptions' | 'podcasts' | 'current'>(
    subscriptions.length > 0 ? 'subscriptions' : 'podcasts',
  )
  const [noResults, setNoResults] = useState(false)
  const [isSearchInProgress, startTransition] = useTransition()
  const { t } = useTranslation()

  const [
    {
      search: { engine },
    },
    updateSettings,
  ] = useSettings()
  const timeout = useRef<ReturnType<typeof setInterval>>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const navigate = useNavigate()

  const searchOnline = async (term: string) => {
    return await searchPodcast(term, engine)
  }

  const setSearchMode = (mode: typeof searchMode) => {
    if (mode !== searchMode) {
      setResults([])
      setSearchMode_(mode)
    }
  }

  const searchEngineOptions = ['iTunes', 'fyyd', 'PodcastIndex']

  const search = async () =>
    startTransition(async function () {
      const term = inputRef.current?.value ?? ''
      if (term.length === 0) return
      let newResults: typeof results = []

      if (searchMode === 'subscriptions') {
        newResults = await subscriptionsEpisodes.getAll({ searchTerm: term })
      } else if (searchMode === 'podcasts') {
        newResults = await searchOnline(term)
      } else if (searchMode === 'current') {
        newResults = searchOnCurrentPodcast(term)
      }

      startTransition(() => {
        setResults(newResults)
        setNoResults(newResults.length === 0)
      })
    })

  useEffect(() => {
    if (inputRef.current && inputRef.current.value.length > 3) {
      search()
    }
  }, [searchMode, engine])

  useEffect(() => {
    setResults([])
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    if (location.pathname !== '/preview' && searchMode === 'current') {
      setSearchMode(subscriptions.length > 0 ? 'subscriptions' : 'podcasts')
    }
  }, [location])

  const searchOnCurrentPodcast = (term: string) => {
    const episodes = location.state.currentPodcastEpisodes as EpisodeData[]
    if (!episodes) return []

    return episodes.filter(
      (episode) =>
        episode.title.toLowerCase().includes(term.toLowerCase()) ||
        episode.description.toLowerCase().includes(term.toLowerCase()),
    )
  }

  const handleChange = async (term: string) => {
    setNoResults(false)
    if (term.length > 3) {
      clearTimeout(timeout.current ?? 0)
      timeout.current = setTimeout(() => search(), 300)
    }
  }

  return (
    <div className="relative flex w-full">
      <div className="flex h-8 w-fit gap-1 p-1 text-primary-4">
        <button
          className={`w-5 ${window.history.state.idx < 1 && results.length === 0 ? 'cursor-default text-primary-8' : 'hover:text-accent-5'}`}
          onClick={() => {
            if (results.length > 0) {
              setResults([])
            } else {
              navigate(-1)
            }
          }}
        >
          {arrowLeft}
        </button>
        <button
          className={`w-5 ${window.history.state.idx >= window.history.length - 1 ? 'cursor-default text-primary-8' : 'hover:text-accent-5'}`}
          onClick={() => navigate(1)}
        >
          {arrowRight}
        </button>
      </div>
      <form
        className="flex w-full"
        onSubmit={(e) => {
          e.preventDefault()
          clearTimeout(timeout.current ?? 0)
          if (inputRef.current) {
            search()
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={t('search_placeholder')}
          className={`peer w-full bg-primary-9 px-2 py-1 focus:outline-none ${noResults && inputRef.current?.value && 'font-semibold text-red-600'}`}
          onChange={(event) => {
            handleChange(event.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Tab') {
              setResults([])
            }
          }}
        />
        <div
          className={`mr-2 items-center gap-2 whitespace-nowrap ${results.length > 0 ? 'flex' : 'hidden active:flex peer-focus:flex'}`}
        >
          <div
            className={`${isSearchInProgress ? '' : 'hidden'} flex w-6 items-center outline-none hover:text-accent-4`}
          >
            <span className="w-6 animate-[spin_1.5s_linear_reverse_infinite]">{sync}</span>
          </div>
          <button
            className={`${searchMode === 'subscriptions' ? 'bg-accent-7' : ''} flex items-center rounded-md border-2 border-accent-7 px-1 py-[1px] text-xs uppercase`}
            type="button"
            onClick={() => {
              setSearchMode('subscriptions')
              inputRef.current?.focus()
            }}
          >
            {t('subscriptions')}
          </button>

          <button
            className={`${searchMode === 'podcasts' ? 'bg-accent-7' : ''} flex items-center rounded-md border-2 border-accent-7 px-1 py-[1px] text-xs uppercase`}
            type="button"
            onClick={() => {
              setSearchMode('podcasts')
              inputRef.current?.focus()
            }}
          >
            {t('podcasts')}
          </button>

          {location.pathname === '/preview' && (
            <button
              className={`${searchMode === 'current' ? 'bg-accent-7' : ''} flex items-center rounded-md border-2 border-accent-7 px-1 py-[1px] text-xs uppercase`}
              type="button"
              onClick={() => {
                setSearchMode('current')
                inputRef.current?.focus()
              }}
            >
              {t('current_podcast')}
            </button>
          )}
        </div>
      </form>

      {(results.length > 0 || isSearchInProgress) && (
        <>
          {/* close with click outside */}
          <div className="absolute left-0 top-0 z-10 mt-10 h-screen w-screen" onClick={() => setResults([])} />

          <div
            className="absolute left-1/2 top-0 z-30 mt-[32px] max-h-[60dvh] w-4/5 -translate-x-1/2 justify-center overflow-hidden overflow-y-auto scroll-smooth rounded-b-md border-x-2 border-primary-8 bg-primary-9 shadow-md shadow-primary-8"
            ref={resultsRef}
          >
            <div className="flex w-full flex-col">
              {searchMode === 'podcasts' && (
                <div className="flex items-center justify-center gap-3 px-4 py-2">
                  {searchEngineOptions.map((newEngine) => (
                    <span
                      key={newEngine}
                      className={`cursor-pointer font-thin ${newEngine === engine ? 'text-accent-5' : ''}`}
                      onClick={() => {
                        updateSettings({ search: { engine: newEngine } })
                      }}
                    >
                      {newEngine}
                    </span>
                  ))}
                </div>
              )}

              {results.map((result, i) => {
                if (searchMode === 'podcasts') {
                  return <PodcastCard key={i} podcast={result as PodcastData} />
                } else {
                  return (
                    <EpisodeCard
                      key={result.id}
                      episode={result as EpisodeData}
                      className="border-b-[1px] border-primary-8 transition-colors hover:bg-primary-8"
                    />
                  )
                }
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SearchBar
