import { Link, useNavigate } from "react-router-dom";
import { useDB } from "../DB";


function LeftMenu() {
  const { subscriptions } = useDB()
  const navigate = useNavigate()

  return (
    <div className="bg-zinc-800 w-56 h-full flex flex-col rounded-md p-2">
      <Link to='/'>
        HOME
      </Link>
      <div className="grid gap-1">
        {
          subscriptions.subscriptions.map(fav => {
            return (
              <div className="bg-zinc-600 p-1 rounded-md flex gap-2 justify-between cursor-pointer hover:bg-zinc-500"
              onClick={()=>navigate('/preview', {
                state: {
                  podcast: fav
                }
              })}
              >
                <img
                  className="bg-zinc-700 h-10 aspect-square rounded-md"
                  src={fav.coverUrl}
                  alt=''
                  />
                <p className="text-right text-sm">{fav.podcastName}</p>
              </div>
            )
          }
          )
        }
      </div>
    </div>
  )
}

export default LeftMenu;