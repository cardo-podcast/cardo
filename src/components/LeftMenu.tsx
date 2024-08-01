import { Link } from "react-router-dom";



function LeftMenu() {

  return(
    <div className="bg-zinc-800 w-40 h-full flex flex-col">
      <Link to='/'>
        HOME
      </Link>
      <Link to='/search'>
        SEARCH
      </Link>
    </div>
  )
}

export default LeftMenu;