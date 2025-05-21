class ThumbnailDispatcher {
    constructor({ maxParallel, pool, openAIService, references }) {
      this.maxParallel = maxParallel;
      this.pool = pool;
      this.openAIService = openAIService;
      this.references = references;
      this.active = new Set();
      this.queue = [];
    }
  
    async enqueue(idea, regenerate = false) {
      if (!regenerate) {
        // insert the pending‐state row immediately
        await this.pool.execute(
          'INSERT INTO thumbnails (title_id, idea_id, status) VALUES (?, ?, ?)',
          [idea.titleId, idea.id, 'pending']
        );
      }
  
      const task = () => this._generateImage(idea);
      if (this.active.size < this.maxParallel) {
        this._start(task);
      } else {
        this.queue.push(task);
      }
    }
  
    _start(task) {
      const p = task()
        .catch(err => console.error(err))
        .finally(() => {
          this.active.delete(p);
          if (this.queue.length) {
            this._start(this.queue.shift());
          }
        });
      this.active.add(p);
    }
  
    async _generateImage(idea) {
      try {
        const imageUrl = await this.openAIService.generateImage(
          idea.id,
          idea.fullPrompt,
          this.references
        );
        await this.pool.execute(
          'UPDATE thumbnails SET status = ?, image_url = ? WHERE idea_id = ?',
          ['completed', imageUrl.imageUrl, idea.id]
        );
      } catch (err) {
        await this.pool.execute(
          'UPDATE thumbnails SET status = ? WHERE idea_id = ?',
          ['failed', idea.id]
        );
        throw err;
      }
    }
  }
  
  module.exports = ThumbnailDispatcher;
  