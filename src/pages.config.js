/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccessDenied from './pages/AccessDenied';
import Activate from './pages/Activate';
import AdminKeys from './pages/AdminKeys';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import FileView from './pages/FileView';
import Home from './pages/Home';
import Repo from './pages/Repo';
import RepoView from './pages/RepoView';
import ScriptEditor from './pages/ScriptEditor';
import SecurityLogs from './pages/SecurityLogs';
import Pricing from './pages/Pricing';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessDenied": AccessDenied,
    "Activate": Activate,
    "AdminKeys": AdminKeys,
    "AdminPanel": AdminPanel,
    "Dashboard": Dashboard,
    "FileView": FileView,
    "Home": Home,
    "Repo": Repo,
    "RepoView": RepoView,
    "ScriptEditor": ScriptEditor,
    "SecurityLogs": SecurityLogs,
    "Pricing": Pricing,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};