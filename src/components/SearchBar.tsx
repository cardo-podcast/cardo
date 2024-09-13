import { useEffect, useRef, useState } from "react";
import { SearchPodcast } from "../engines/search/base";
import { EpisodeData, PodcastData } from "..";
import PodcastCard from "./PodcastCard";
import { useTranslation } from "react-i18next";
import { arrowLeft, arrowRight } from "../Icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useDB } from "../DB/DB";
import EpisodeCard from "./EpisodeCard";


function SearchBar() {
  const [results, setResults] = useState<PodcastData[] | EpisodeData[]>([])
  const { subscriptionsEpisodes, subscriptions: {subscriptions} } = useDB()
  const [searchMode, setSearchMode_] = useState<'subscriptions' | 'podcasts' | 'current'>(subscriptions.length > 0 ? 'subscriptions': 'podcasts')
  const [noResults, setNoResults] = useState(false)
  const timeout = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const location = useLocation();

  const navigate = useNavigate()

  const searchOnline = async (term: string) => {
    return await SearchPodcast(term)
  }

  const setSearchMode = (mode: typeof searchMode) => {
    if (mode != searchMode) {
      setResults([])
      setSearchMode_(mode)
    }
  }

  const search = async (term: string) => {
    if (term.length === 0) return
    let newResults: typeof results = []

    if (searchMode === 'subscriptions') {
      newResults = await subscriptionsEpisodes.getAll({ searchTerm: term })
    } else if (searchMode === 'podcasts') {
      newResults = await searchOnline(term)
    } else if (searchMode === 'current') {
      newResults = searchOnCurrentPodcast(term)
    }

    setResults(newResults)
    setNoResults(newResults.length == 0)
  }

  useEffect(() => {
    if (inputRef.current && inputRef.current.value.length > 3) {
      search(inputRef.current.value)
    }
  }, [searchMode])

  useEffect(() => {
    setResults([])
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    if (location.pathname != '/preview' && searchMode === 'current') {
      setSearchMode(subscriptions.length > 0 ? 'subscriptions': 'podcasts')
    }
  }, [location])

  const searchOnCurrentPodcast = (term: string) => {
    const episodes = location.state.currentPodcastEpisodes as EpisodeData[]
    if (!episodes) return []


    return episodes.filter(episode => episode.title.toLowerCase().includes(term.toLowerCase()) ||
                                      episode.description.toLowerCase().includes(term.toLowerCase()))
  }

  const handleChange = async (term: string) => {
    setNoResults(false)
    if (term.length > 3) {
      clearTimeout(timeout.current)
      timeout.current = setTimeout(() => search(term), 300)
    }
  }

  return (
    <div className="flex relative w-full">
      <div className="flex gap-1 w-fit h-8 p-1 text-primary-4">
        <button className={`w-5 ${window.history.state.idx < 1 && results.length == 0 ? 'cursor-default text-primary-8' : 'hover:text-accent-5'}`}
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
        <button className={`w-5 ${window.history.state.idx >= window.history.length - 1 ? 'cursor-default text-primary-8' : 'hover:text-accent-5'}`}
          onClick={() => navigate(1)}
        >
          {arrowRight}
        </button>
      </div>
      <form
        className="flex w-full"
        onSubmit={e => {
          e.preventDefault()
          clearTimeout(timeout.current)
          if (inputRef.current) {
            search(inputRef.current.value)
          }
        }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('search_placeholder')}
          className={`py-1 px-2 bg-primary-9 w-full focus:outline-none peer ${noResults && inputRef.current?.value && 'text-red-600 font-semibold'}`}
          onChange={(event) => { handleChange(event.target.value) }}
          onKeyDown={e => {
            if (e.key === 'Escape' || e.key === 'Tab') {
              setResults([])
            }
          }} />
        <div className="items-center gap-2 mr-2 hidden peer-focus:flex active:flex whitespace-nowrap">

          <button className={`${searchMode == 'subscriptions' ? 'bg-accent-7' : ''} border-2 border-accent-7 rounded-md flex items-center text-xs uppercase px-1 py-[1px]`}
            type="button"
            onClick={() => {
              setSearchMode('subscriptions')
              inputRef.current?.focus()
            }}
          >
            {t('subscriptions')}
          </button>

          <button className={`${searchMode == 'podcasts' ? 'bg-accent-7' : ''} border-2 border-accent-7 rounded-md flex items-center text-xs uppercase px-1 py-[1px]`}
            type="button"
            onClick={() => {
              setSearchMode('podcasts')
              inputRef.current?.focus()
            }}
          >
            {t('podcasts')}
          </button>

          {
            location.pathname == '/preview' &&

            <button className={`${searchMode == 'current' ? 'bg-accent-7' : ''} border-2 border-accent-7 rounded-md flex items-center text-xs uppercase px-1 py-[1px]`}
              type="button"
              onClick={() => {
                setSearchMode('current')
                inputRef.current?.focus()
              }}
            >
              {t('current_podcast')}
            </button>
          }

        </div>
      </form>

      {
        results.length > 0 &&
        <>
          {/* close with click outside */}
          <div className="absolute z-10 mt-10 top-0 left-0 w-screen h-screen" onClick={() => setResults([])} />

          <div className="w-4/5 absolute left-1/2 -translate-x-1/2 top-0 mt-[32px] z-10 max-h-[400px] flex justify-center overflow-y-auto scroll-smooth bg-primary-9 border-x-2 border-primary-8 rounded-b-md overflow-hidden shadow-md shadow-primary-8"
            ref={resultsRef}
          >
            <div className="grid w-full">
              {
                results.map((result, i) => {
                  if (searchMode === 'podcasts') {
                    return <PodcastCard key={i} podcast={result as PodcastData} />
                  } else {
                    return <EpisodeCard key={result.id}
                      episode={result as EpisodeData}
                      noLazyLoad={true}
                      className="hover:bg-primary-8 transition-colors border-b-[1px] border-primary-8"
                    />
                  }
                })
              }
            </div>
          </div>)
        </>
      }
    </div>
  )
}

export default SearchBar