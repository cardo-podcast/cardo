import { SearchPodcast } from "../SearchAPI/base";


function SearchPage() {

  const handleChange = async(term: string) => {
    if (term.length > 3) {
      const results = await SearchPodcast(term)
      console.log(results)
    }
  }

  return(
    <div>
      <input
        type="text"
        className="p-1 bg-slate-600 rounded-lg"
        onChange={(event) => {handleChange(event.target.value)}}
        ></input>

    </div>
  )
}

export default SearchPage;