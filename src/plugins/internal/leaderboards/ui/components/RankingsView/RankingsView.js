import DataTable from '@ui/DataTable';
import CardContainer from '@ui/CardContainer';
import { leaderboardsApi } from '../LeaderboardManager/api/leaderboardsApi.js';

class RankingsView {
    constructor(config = {}) {
        this.container = null;
        this.selectedBoardId = config.boardId || null;
        this.rankings = [];
        this.boards = [];
        this.pagination = { limit: 50, offset: 0, total: 0 };
        this.isLoading = false;
    }

    async init(container) {
        this.container = container;
        await this.loadBoards();
        await this.render();
        if (this.selectedBoardId) {
            await this.loadRankings();
        }
    }

    async loadBoards() {
        try {
            const response = await leaderboardsApi.listLeaderboards();
            this.boards = response.leaderboards || [];
            if (!this.selectedBoardId && this.boards.length > 0) {
                this.selectedBoardId = this.boards[0].id;
            }
        } catch (error) {
            console.error('Error loading boards for rankings:', error);
        }
    }

    async loadRankings() {
        if (!this.selectedBoardId) return;

        this.isLoading = true;
        this.renderLoading();

        try {
            const response = await leaderboardsApi.getAdminRankings(
                this.selectedBoardId,
                this.pagination.limit,
                this.pagination.offset
            );
            this.rankings = response.rankings || [];
            this.pagination.total = response.pagination?.total || 0;
        } catch (error) {
            console.error('Error loading rankings:', error);
            this.rankings = [];
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    async handleDeleteEntry(userId) {
        if (!confirm('Are you sure you want to remove this score entry?')) return;

        try {
            await leaderboardsApi.deleteRankingEntry(this.selectedBoardId, userId);
            await this.loadRankings();
        } catch (error) {
            alert('Error deleting entry: ' + error.message);
        }
    }

    renderLoading() {
        if (!this.container) return;
        this.container.innerHTML = '<div class="loading">Loading rankings...</div>';
    }

    async render() {
        if (!this.container) return;

        const content = document.createElement('div');
        content.className = 'rankings-view';

        // Board Selection Header
        const header = document.createElement('div');
        header.className = 'rankings-view__header';
        header.style.marginBottom = '20px';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '15px';

        const selectLabel = document.createElement('label');
        selectLabel.innerText = 'Select Leaderboard:';
        header.appendChild(selectLabel);

        const select = document.createElement('select');
        select.className = 'form-control';
        select.style.flex = '1';

        this.boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.text = `${board.name} (${board.game_mode || 'Default'})`;
            option.selected = board.id == this.selectedBoardId;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.selectedBoardId = e.target.value;
            this.pagination.offset = 0;
            this.loadRankings();
        });

        header.appendChild(select);

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn--secondary';
        refreshBtn.innerHTML = '🔄 Refresh';
        refreshBtn.addEventListener('click', () => this.loadRankings());
        header.appendChild(refreshBtn);

        content.appendChild(header);

        // Rankings Table
        if (this.selectedBoardId) {
            const tableData = this.rankings.map(entry => ({
                rank: `#${entry.rank_position}`,
                player: entry.username || `User ${entry.user_id}`,
                score: entry.score,
                date: entry.submitted_at,
                user_id: entry.user_id // needed for handler
            }));

            const table = new DataTable({
                columns: [
                    { field: 'rank', label: 'RANK' },
                    { field: 'player', label: 'PLAYER' },
                    { field: 'score', label: 'SCORE' },
                    {
                        field: 'date',
                        label: 'DATE',
                        formatter: (val) => new Date(val).toLocaleString()
                    }
                ],
                actions: [
                    {
                        id: 'delete',
                        handler: (row) => this.handleDeleteEntry(row.user_id)
                    }
                ],
                data: tableData,
                emptyMessage: 'No rankings found for this board.'
            });

            const card = new CardContainer({
                title: 'Board Rankings',
                subtitle: `Top entries for the selected competition`,
                content: table.render()
            });

            content.appendChild(card.render());

            // Pagination (simplified)
            if (this.pagination.total > this.pagination.limit) {
                const paginationDiv = document.createElement('div');
                paginationDiv.className = 'pagination-simple';
                paginationDiv.style.marginTop = '15px';
                paginationDiv.style.display = 'flex';
                paginationDiv.style.justifyContent = 'center';
                paginationDiv.style.gap = '10px';

                const prevBtn = document.createElement('button');
                prevBtn.className = 'btn btn--sm';
                prevBtn.innerText = '← Previous';
                prevBtn.disabled = this.pagination.offset === 0;
                prevBtn.onclick = () => {
                    this.pagination.offset = Math.max(0, this.pagination.offset - this.pagination.limit);
                    this.loadRankings();
                };

                const nextBtn = document.createElement('button');
                nextBtn.className = 'btn btn--sm';
                nextBtn.innerText = 'Next →';
                nextBtn.disabled = this.pagination.offset + this.pagination.limit >= this.pagination.total;
                nextBtn.onclick = () => {
                    this.pagination.offset += this.pagination.limit;
                    this.loadRankings();
                };

                paginationDiv.appendChild(prevBtn);
                paginationDiv.appendChild(nextBtn);
                content.appendChild(paginationDiv);
            }
        } else {
            content.innerHTML += '<p>Please select a leaderboard to view rankings.</p>';
        }

        this.container.innerHTML = '';
        this.container.appendChild(content);

    }
}

export default RankingsView;
