import { useEffect, useRef, useState } from "react";
import { SearchPodcast } from "../SearchAPI/base";
import { PodcastData } from "..";
import PodcastCard from "./PodcastCard";
import { useTranslation } from "react-i18next";


function SearchBar () {
  const [results, setResults] = useState<PodcastData[]>([])
  const timeout = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const {t} = useTranslation()

  const searchOnline = async(term: string) => {
    return await SearchPodcast(term)
  }

  const search = async(term: string) => {
    setResults(await searchOnline(term))
  }

  const handleChange = async(term: string) => {
    if (term.length > 3) {
      clearTimeout(timeout.current)
      timeout.current = setTimeout(() => search(term), 300)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setResults([])
      }
    };

    if (results.length > 0){
      document.addEventListener('mousedown', handleClickOutside);
    }else{
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [results]);

  return(
    <div className="relative">
    <form onSubmit={e => {
      e.preventDefault()
      clearTimeout(timeout.current)
      if (inputRef.current){
        search(inputRef.current.value)
      }
    }}>
      <input
      ref={inputRef}
        type="text"
        placeholder={t('search_placeholder')}
        className="py-1 px-2 bg-zinc-800 placeholder-zinc-400 text-zinc-400 w-full focus:outline-none"
        onChange={(event) => {handleChange(event.target.value)}}
        onKeyDown={e => {
          if (e.key === 'Escape' || e.key === 'Tab') {
            setResults([])
          }
        }}
        />
    </form>

    {
      results.length > 0 &&
      (<div className="w-4/5 absolute left-1/2 -translate-x-1/2 top-0 mt-[32px] z-10 max-h-[400px] flex justify-center overflow-y-auto bg-zinc-900 border-x-2 border-zinc-800"
        ref={resultsRef}
      >
      <div className="grid w-full">
        {
          results.map((result, i) => {
            return <PodcastCard key={i} podcast={result} callback={() => setResults([])}/>
          })
        }
      </div>
    </div>)
    }
    </div>
  )
}

export default SearchBar