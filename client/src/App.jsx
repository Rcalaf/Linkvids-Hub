// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/Layout/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ManageAttributes from './pages/Admin/ManageAttributes';
import ManageUserTypes from './pages/Admin/ManageUserTypes';
import CreateUsers from './pages/Admin/CreateUsers';
import UserList from './pages/Admin/UserList';
import ShowUserPage from './pages/Admin/ShowUserPage';
import EditUserPage from './pages/Admin/EditUserPage';
import ConfigManager from './pages/Admin/ConfigManager'; 
import ConfigHubCards from './components/Admin/ConfigHubCards';
import ErrorPage from './pages/ErrorPage';
import RequirePermission from './components/Auth/RequirePermission';

import RegisterChoice from './pages/Auth/RegisterChoice';
import RegisterCollaborator from './pages/Auth/RegisterCollaborator';
import RegisterAgency from './pages/Auth/RegisterAgency';
import Unauthorized from './pages/Auth/Unauthorized'; 
import RequireAuth from './components/Auth/RequireAuth';
import Login from './pages/Auth/Login';

import CollaboratorLayout from './components/Layout/CollaboratorLayout'; 
import CreatorDashboard from './pages/Creator/CreatorDashboard'; 
import CreatorProfile from './pages/Creator/CreatorProfile'; 
import CreatorJobBoard from './pages/Creator/Jobs/CreatorJobBoard';
import CreatorJobDetail from './pages/Creator/Jobs/CreatorJobDetail';

import JobList from './pages/Admin/Jobs/JobList';
import JobForm from './pages/Admin/Jobs/JobForm'; 
import JobDetail from './pages/Admin/Jobs/JobDetail';

import Notifications from './pages/Creator/Notifications';
import AdminNotifications from './pages/Admin/Notifications/AdminNotifications';

import AdminList from './pages/Admin/AdminUsers/AdminList';
import AdminForm from './pages/Admin/AdminUsers/AdminForm';

import NewsList from './pages/Admin/News/NewsList';
import NewsForm from './pages/Admin/News/NewsForm';
import NewsDetail from './pages/Admin/News/NewsDetail';

function App() {
  return (
    <Routes>
      {/* <Route path="/" element={<Layout />}> */}
        
        {/* Public/Landing/Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* <Route index element={<Login />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterChoice />} />
        <Route path="/register/collaborator" element={<RegisterCollaborator />} />
        <Route path="/register/agency" element={<RegisterAgency />} />
        <Route path="unauthorized" element={<Unauthorized />} />
        
        <Route element={<RequireAuth allowedRoles={['LinkVidsAdmin']} />}>
          {/* Admin Protected Routes */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} /> {/* /admin */}
            <Route path="config" element={<RequirePermission module="config" level="view" layout={<ConfigManager />}/>}>
                <Route index element={<ConfigHubCards />} /> 
                <Route path="attributes" element={<ManageAttributes />} /> 
                <Route path="user-types" element={<ManageUserTypes />} />
            </Route>
              <Route path="users" element={<RequirePermission module="users" level="view" />}>
                <Route index element={<AdminList />} /> 
             </Route>
             <Route path="users" element={<RequirePermission module="users" level="edit" />}>
                <Route path="create" element={<AdminForm />} />
                <Route path="edit/:id" element={<AdminForm />} />
             </Route>
            <Route path="collaborators" element={<RequirePermission module="collaborators" level="view" />}>
                <Route index element={<UserList />} />     {/* /admin/collaborators (The List) */}
                <Route path="create" element={<CreateUsers />} /> {/* /admin/collaborators/create */}
                <Route path=":userId" element={<ShowUserPage />} /> 
                <Route path=":userId/edit" element={<EditUserPage />} /> {/*/admin/collaborators/:id/edit*/}
            </Route>
            <Route path="jobs" element={<RequirePermission module="jobs" level="view" />}>
                <Route index element={<JobList />} />            {/* /admin/jobs */}
                <Route path="create" element={<JobForm />} />    {/* /admin/jobs/create */}
                <Route path=":jobId" element={<JobDetail />} />
                <Route path=":jobId/edit" element={<JobForm />} /> {/* /admin/jobs/:id/edit */}
            </Route>
             <Route path="news" element={<RequirePermission module="news" level="view" />}>
                <Route index element={<NewsList />} />           
                <Route path="create" element={<NewsForm />} />    
                <Route path=":id" element={<NewsDetail />} /> 
                <Route path=":id/edit" element={<NewsForm />} /> 
            </Route> 
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>
        </Route>

        {/* <Route element={<RequireAuth allowedRoles={['Collaborator']} />}> */}
          <Route path="creator" element={<CollaboratorLayout />}>
              <Route index element={<CreatorDashboard />} /> {/* /creator */}
              <Route path="profile" element={<CreatorProfile />} /> {/* /creator/profile */}
              <Route path="jobs" element={<CreatorJobBoard />} />
              <Route path="jobs/:jobId" element={<CreatorJobDetail />} />
              <Route path="notifications" element={<Notifications />} />
          </Route>
      {/* </Route> */}

        {/* Catch all */}
      <Route path="*" element={<ErrorPage />} />
    
    </Routes>
  );
}

export default App;