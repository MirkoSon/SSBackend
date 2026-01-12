/**
 * AlertService - Handles business logic and data access for economy alerts.
 * Provides CRUD operations for alert configuration system.
 */
class AlertService {
    constructor(db) {
        this.db = db;
        this.initializeTables();
    }

    /**
     * Initialize alerts table if it doesn't exist
     */
    async initializeTables() {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS plugin_economy_alerts (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        threshold INTEGER NOT NULL,
                        notification_method TEXT NOT NULL,
                        notification_target TEXT,
                        status TEXT DEFAULT 'active',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_triggered DATETIME,
                        trigger_count INTEGER DEFAULT 0
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.error('Error initializing alerts table:', error);
        }
    }

    /**
     * Get all alerts from database
     */
    async getAlerts() {
        try {
            return await new Promise((resolve, reject) => {
                this.db.all(`
                    SELECT * FROM plugin_economy_alerts 
                    ORDER BY created_at DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error fetching alerts:', error);
            // Return mock data as fallback for now
            return [
                { 
                    id: 'mock1', 
                    name: 'High Transaction Volume', 
                    type: 'transaction_volume', 
                    threshold: 1000, 
                    notification_method: 'email',
                    notification_target: 'admin@example.com',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    trigger_count: 0
                },
                { 
                    id: 'mock2', 
                    name: 'Large Balance Changes', 
                    type: 'balance_changes', 
                    threshold: 5000, 
                    notification_method: 'dashboard',
                    notification_target: null,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    trigger_count: 0
                }
            ];
        }
    }

    /**
     * Get single alert by ID
     */
    async getAlert(alertId) {
        try {
            return await new Promise((resolve, reject) => {
                this.db.get(`
                    SELECT * FROM plugin_economy_alerts 
                    WHERE id = ?
                `, [alertId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        } catch (error) {
            console.error('Error fetching alert:', error);
            return null;
        }
    }

    /**
     * Create a new alert
     */
    async createAlert(alertData) {
        try {
            const alertId = require('crypto').randomUUID();
            const alert = {
                id: alertId,
                name: alertData.name,
                type: alertData.type,
                threshold: alertData.threshold,
                notification_method: alertData.notificationMethod,
                notification_target: alertData.notificationTarget || null,
                status: alertData.status || 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                trigger_count: 0
            };

            await new Promise((resolve, reject) => {
                this.db.run(`
                    INSERT INTO plugin_economy_alerts 
                    (id, name, type, threshold, notification_method, notification_target, 
                     status, created_at, updated_at, trigger_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    alert.id, alert.name, alert.type, alert.threshold, 
                    alert.notification_method, alert.notification_target,
                    alert.status, alert.created_at, alert.updated_at, alert.trigger_count
                ], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('AlertService: Created alert:', alert.id);
            return alert;

        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    /**
     * Update an existing alert
     */
    async updateAlert(alertId, updateData) {
        try {
            const updateFields = [];
            const values = [];

            // Build dynamic update query
            if (updateData.name !== undefined) {
                updateFields.push('name = ?');
                values.push(updateData.name);
            }
            if (updateData.type !== undefined) {
                updateFields.push('type = ?');
                values.push(updateData.type);
            }
            if (updateData.threshold !== undefined) {
                updateFields.push('threshold = ?');
                values.push(updateData.threshold);
            }
            if (updateData.notificationMethod !== undefined) {
                updateFields.push('notification_method = ?');
                values.push(updateData.notificationMethod);
            }
            if (updateData.notificationTarget !== undefined) {
                updateFields.push('notification_target = ?');
                values.push(updateData.notificationTarget);
            }
            if (updateData.status !== undefined) {
                updateFields.push('status = ?');
                values.push(updateData.status);
            }

            updateFields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(alertId);

            await new Promise((resolve, reject) => {
                this.db.run(`
                    UPDATE plugin_economy_alerts 
                    SET ${updateFields.join(', ')}
                    WHERE id = ?
                `, values, function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Get updated alert
            const updatedAlert = await this.getAlert(alertId);

            console.log('AlertService: Updated alert:', alertId);
            return { 
                success: true, 
                message: 'Alert updated successfully',
                alert: updatedAlert 
            };

        } catch (error) {
            console.error('Error updating alert:', error);
            return { 
                success: false, 
                message: 'Failed to update alert: ' + error.message 
            };
        }
    }

    /**
     * Delete an alert
     */
    async deleteAlert(alertId) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(`
                    DELETE FROM plugin_economy_alerts 
                    WHERE id = ?
                `, [alertId], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('AlertService: Deleted alert:', alertId);
            return { 
                success: true, 
                message: 'Alert deleted successfully' 
            };

        } catch (error) {
            console.error('Error deleting alert:', error);
            return { 
                success: false, 
                message: 'Failed to delete alert: ' + error.message 
            };
        }
    }

    /**
     * Check if an alert should be triggered based on current metrics
     */
    async checkAlert(alertId, currentValue) {
        try {
            const alert = await this.getAlert(alertId);
            
            if (!alert || alert.status !== 'active') {
                return false;
            }

            // Simple threshold check
            if (currentValue >= alert.threshold) {
                await this.triggerAlert(alertId);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking alert:', error);
            return false;
        }
    }

    /**
     * Trigger an alert (increment counter, update last triggered time)
     */
    async triggerAlert(alertId) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(`
                    UPDATE plugin_economy_alerts 
                    SET trigger_count = trigger_count + 1,
                        last_triggered = ?
                    WHERE id = ?
                `, [new Date().toISOString(), alertId], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Here you would implement actual notification sending
            // For now, just log the trigger
            console.log('🚨 Alert triggered:', alertId);
            
            return true;
        } catch (error) {
            console.error('Error triggering alert:', error);
            return false;
        }
    }

    /**
     * Get alert statistics
     */
    async getAlertStats() {
        try {
            const stats = await new Promise((resolve, reject) => {
                this.db.get(`
                    SELECT 
                        COUNT(*) as total_alerts,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts,
                        SUM(trigger_count) as total_triggers,
                        COUNT(CASE WHEN last_triggered IS NOT NULL AND 
                                      DATE(last_triggered) = DATE('now') THEN 1 END) as triggered_today
                    FROM plugin_economy_alerts
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { total_alerts: 0, active_alerts: 0, total_triggers: 0, triggered_today: 0 });
                });
            });

            return stats;
        } catch (error) {
            console.error('Error fetching alert stats:', error);
            return { total_alerts: 0, active_alerts: 0, total_triggers: 0, triggered_today: 0 };
        }
    }
}

module.exports = AlertService;