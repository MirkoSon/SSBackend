import { achievementsApi } from './api/achievementsApi.js';
import CardContainer from '@ui/CardContainer';
import DataTable from '@ui/DataTable';
import Button from '@ui/Button';

export class AchievementManagerView {
  constructor(container) {
    this.container = container;
    this.achievements = [];
    this.init();
  }

  async init() {
    await this.refresh();
  }

  async refresh() {
    try {
      this.achievements = await achievementsApi.getAll();
      this.render();
    } catch (err) {
      console.error(err);
      this.showError('Failed to load achievements');
    }
  }

  render() {
    this.container.innerHTML = '';

    const card = new CardContainer({
      title: 'Achievements',
      subtitle: 'Manage game achievements and unlock criteria',
      content: this.renderContent(),
      actions: this.renderHeaderActions()
    });

    this.container.appendChild(card.render());
  }

  renderHeaderActions() {
    const actions = document.createElement('div');
    actions.className = 'achievement-actions';

    const addBtn = new Button({
      label: 'New Achievement',
      icon: 'add',
      variant: 'primary',
      size: 'small',
      onClick: () => this.showModal()
    });

    const refreshBtn = new Button({
      label: 'Refresh',
      icon: 'refresh',
      variant: 'secondary',
      size: 'small',
      onClick: () => this.refresh()
    });

    actions.appendChild(refreshBtn.render());
    actions.appendChild(addBtn.render());

    return actions;
  }

  renderContent() {
    const content = document.createElement('div');
    content.className = 'achievement-manager-content';

    const tableSection = this.renderTable();
    content.appendChild(tableSection);

    return content;
  }

  renderTable() {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'achievement-table-container';

    const columns = [
      { field: 'code', label: 'Code', width: '15%', formatter: (val) => `<span class="code-text">${val}</span>` },
      { field: 'name', label: 'Name', width: '20%', sortable: true, formatter: (val) => `<strong>${val}</strong>` },
      { field: 'type', label: 'Type', width: '10%', formatter: (val) => `<span class="status-badge">${val.toUpperCase()}</span>` },
      { field: 'metric_name', label: 'Metric', width: '15%', formatter: (val) => `<span class="code-text">${val || '-'}</span>` },
      { field: 'target', label: 'Target', width: '10%' },
      { field: 'is_active', label: 'Active', width: '10%', formatter: (val) => val ? '✅' : '❌' },
      { field: 'actions', label: 'Actions', width: '15%', formatter: (_, row) => this.renderRowActions(row) }
    ];

    this.dataTable = new DataTable({
      columns,
      data: this.achievements,
      emptyMessage: 'No achievements found.',
      loading: false
    });

    tableContainer.appendChild(this.dataTable.render());
    return tableContainer;
  }

  renderRowActions(row) {
    const actions = document.createElement('div');
    actions.className = 'data-table__actions';

    this.dataTable.renderActions(actions, row, [
      { id: 'edit', handler: () => this.editAchievement(row.id) },
      { id: 'delete', handler: () => this.deleteAchievement(row.id) }
    ]);

    return actions;
  }

  async deleteAchievement(id) {
    if (!confirm('Are you sure you want to delete this achievement? User progress will be lost.')) return;
    try {
      await achievementsApi.delete(id);
      await this.refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  editAchievement(id) {
    const achievement = this.achievements.find(a => a.id == id);
    if (achievement) this.showModal(achievement);
  }

  showModal(achievement = null) {
    const isEdit = !!achievement;
    const title = isEdit ? 'Edit Achievement' : 'New Achievement';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="achievementForm">
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Unique Code</label>
                    <input type="text" name="code" class="form-control" required placeholder="e.g. KILL_100" value="${achievement ? achievement.code : ''}">
                </div>
                <div class="form-group" style="flex:1; margin-left: 1rem;">
                    <label>Active</label>
                    <div style="margin-top: 10px;">
                        <input type="checkbox" name="is_active" ${!achievement || achievement.is_active ? 'checked' : ''}> Enabled
                    </div>
                </div>
            </div>

            <div class="form-group">
              <label>Name</label>
              <input type="text" name="name" class="form-control" required value="${achievement ? achievement.name : ''}">
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <input type="text" name="description" class="form-control" required value="${achievement ? achievement.description : ''}">
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:1">
                <label>Type</label>
                <select name="type" class="form-control">
                  <option value="incremental" ${achievement?.type === 'incremental' ? 'selected' : ''}>Incremental</option>
                  <option value="one-shot" ${achievement?.type === 'one-shot' ? 'selected' : ''}>One-Shot</option>
                </select>
              </div>
              <div class="form-group" style="flex:1; margin-left: 1rem;">
                <label>Target Value</label>
                <input type="number" name="target" class="form-control" required value="${achievement ? achievement.target : 1}">
              </div>
            </div>

            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Metric Name</label>
                    <input type="text" name="metric_name" class="form-control" placeholder="e.g. kills, wins" value="${achievement ? achievement.metric_name : ''}">
                </div>
                <div class="form-group" style="flex:1; margin-left: 1rem;">
                    <label>Season ID (Optional)</label>
                    <input type="text" name="season_id" class="form-control" placeholder="e.g. S1" value="${achievement ? achievement.season_id || '' : ''}">
                </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-close-modal">Cancel</button>
          <button class="btn btn-primary" id="saveBtn">${isEdit ? 'Update' : 'Create'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelectorAll('.btn-close, .btn-close-modal').forEach(b => b.onclick = close);

    overlay.querySelector('#saveBtn').onclick = async (e) => {
      const btn = e.target;
      const form = overlay.querySelector('#achievementForm');
      if (!form.reportValidity()) return;

      btn.disabled = true;
      btn.textContent = 'Saving...';

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Format data types
      data.target = parseInt(data.target);
      data.is_active = formData.get('is_active') === 'on';

      try {
        if (isEdit) {
          await achievementsApi.update(achievement.id, data);
        } else {
          await achievementsApi.create(data);
        }
        close();
        this.refresh();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = isEdit ? 'Update' : 'Create';
      }
    };
  }

  showError(message) {
    this.container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}
