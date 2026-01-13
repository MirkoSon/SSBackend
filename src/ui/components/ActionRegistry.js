/**
 * ActionRegistry - central repository for standard UI actions
 * Ensures consistency across all plugins and views.
 */
export const ActionRegistry = {
    view: {
        id: 'view',
        label: '👁️',
        title: 'View Details',
        className: 'action-btn--view'
    },
    edit: {
        id: 'edit',
        label: '📝',
        title: 'Edit',
        className: 'action-btn--edit'
    },
    delete: {
        id: 'delete',
        label: '🗑️',
        title: 'Delete',
        className: 'action-btn--danger'
    },
    rankings: {
        id: 'rankings',
        label: '🏆',
        title: 'View Rankings',
        className: 'action-btn--rankings'
    },
    refresh: {
        id: 'refresh',
        label: '🔄',
        title: 'Refresh',
        className: 'action-btn--refresh'
    },
    add: {
        id: 'add',
        label: '➕',
        title: 'Add New',
        className: 'action-btn--primary'
    },
    history: {
        id: 'history',
        label: '📜',
        title: 'View History',
        className: 'action-btn--history'
    },
    save: {
        id: 'save',
        label: '💾',
        title: 'Save',
        className: 'action-btn--primary'
    },
    close: {
        id: 'close',
        label: '❌',
        title: 'Close',
        className: 'action-btn--close'
    },

    /**
     * Resolves an action configuration. Returns a standard configuration if a string ID is passed,
     * or merges a custom object with standard defaults.
     */
    resolve(action) {
        if (typeof action === 'string') {
            return this[action] || { label: action, title: action };
        }

        // If it's a custom object referencing a standard ID
        if (action.id && this[action.id]) {
            return { ...this[action.id], ...action };
        }

        return action;
    }
};

export default ActionRegistry;
