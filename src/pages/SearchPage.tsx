import { PodcastData } from "..";
import appIcon from '../../src-tauri/icons/icon.png'
import { SyntheticEvent } from "react";


function PodcastPreview({ result }: { result: PodcastData }) {

  return (
    <div className="flex bg-primary-8 rounded-md h-20 p-2 justify-between gap-4">
      <img
        className="bg-primary-7 h-full aspect-square rounded-md"
        alt=""
        src={result.coverUrl}
        onError={(e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = appIcon}
      />

      <div className="flex flex-col text-right">
        <p>{result.podcastName}</p>
        <p>{result.artistName}</p>
      </div>
    </div>
  )
}

function SearchPage({ results }: { results: Array<PodcastData> }) {

  return (
    <div className="w-full h-full p-2 overflow-y-auto flex justify-center">
      <div className="grid px-2 gap-1 w-[80%]">
        {
          results.map(result => {
            return <PodcastPreview result={result} />
          })
        }
      </div>
    </div>
  )
}

export default SearchPage;