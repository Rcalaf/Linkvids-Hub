import { useAuth } from './useAuth';

export const usePermissions = () => {
    const { auth } = useAuth();
    const user = auth.user;

//     console.log(user)
// console.log(user.permissions)
    // Helper: Permissions map
    const levels = { none: 0, view: 1, edit: 2 };

    const can = (module, requiredLevel = 'view') => {
        // Safety check: if no user or no perms, deny
        if (!user || !user.permissions) return false;

        const userLevel = levels[user.permissions[module] || 'none'];
        const reqLevel = levels[requiredLevel];

        return userLevel >= reqLevel;
    };

    return { can };
};