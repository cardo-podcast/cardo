import { useEffect, useRef, useState } from "react";
import { SearchPodcast } from "../SearchAPI/base";
import { PodcastData } from "..";
import PodcastCard from "./PodcastCard";


function SearchBar () {
  const [results, setResults] = useState<PodcastData[]>([])
  const timeout = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

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
    <div className="relative w-4/5 mx-auto">
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
        placeholder="Search a podcast..."
        className="py-1 px-2 bg-zinc-600 w-full rounded-md focus:outline-none"
        onChange={(event) => {handleChange(event.target.value)}}
        onKeyDown={e => {
          if (e.key == 'Escape' || e.key == 'Tab') {
            setResults([])
          }
        }}
        />
    </form>

    {
      results.length > 0?
      (<div className="absolute left-1/2 -translate-x-1/2 top-0 mt-[35px] z-10 max-h-[400px] w-full flex justify-center py-1 px-2 overflow-y-auto bg-zinc-800 rounded-md"
        ref={resultsRef}
      >
      <div className="grid gap-1 w-full">
        {
          results.map((result, i) => {
            return <PodcastCard key={i} podcast={result} callback={() => setResults([])}/>
          })
        }
      </div>
    </div>)
    : <></>
    }
    </div>
  )
}

export default SearchBar