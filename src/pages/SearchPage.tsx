import { useState } from "react";
import { PodcastData } from "..";
import * as icons from "../Icons"


function PodcastPreview ({result}: {result: PodcastData}) {
  const [imageError, setImageError] = useState(false)

  return(
    <div className="flex bg-primary-800 rounded-md h-20 p-2 justify-between gap-4">
      {imageError?
        icons.photo:
        <img
        className="bg-primary-700 h-full aspect-square rounded-md"
        alt=""
        src={result.coverUrl}
        onError={() => setImageError(true)}
        />
      }

      <div className="flex flex-col text-right">
        <p>{result.podcastName}</p>
        <p>{result.artistName}</p>
      </div>
    </div>
  )
}

function SearchPage({results}: {results: Array<PodcastData>}) {

  return(
    <div className="w-full h-full p-2 overflow-y-auto flex justify-center">
      <div className="grid px-2 gap-1 w-[80%]">
        {
          results.map(result => {
            return <PodcastPreview result={result}/>
          })
        }
      </div>
    </div>
  )
}

export default SearchPage;