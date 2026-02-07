import { useLocation, Navigate, Outlet } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

const RequirePermission = ({ module, level = 'view', layout = null }) => {
    const { can } = usePermissions();
    const location = useLocation();
    
    if (!can(module, level)) {
        // TODO: redirect to unauthorized page instead of admin dashboard...
        return <Navigate to="/admin/" state={{ from: location }} replace />;
    }

    return !!layout ? layout : <Outlet />;
};

export default RequirePermission;