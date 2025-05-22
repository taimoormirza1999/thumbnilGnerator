class ThumbnailDispatcher {
    constructor({ maxParallel, pool, openAIService, references }) {
      this.maxParallel = maxParallel;
      this.pool = pool;
      this.openAIService = openAIService;
      this.references = references;
      this.active = new Set();
      this.queue = [];
      this.maxRetries = 2; // Number of retries for failed generations
    }
  
    async enqueue(idea, regenerate = false) {
      const task = {
        idea,
        regenerate,
        retryCount: 0,
        execute: () => this._generateImage(idea, regenerate, 0)
      };
      
      if (this.active.size < this.maxParallel) {
        this._start(task);
      } else {
        this.queue.push(task);
      }
      
      // Return a promise that resolves when the task is complete
      return new Promise((resolve, reject) => {
        task.resolve = resolve;
        task.reject = reject;
      });
    }
  
    _start(task) {
      console.log(`Starting task for idea ${task.idea.id}, retry count: ${task.retryCount}`);
      
      const p = task.execute()
        .then(result => {
          if (task.resolve) task.resolve(result);
          return result;
        })
        .catch(err => {
          console.error(`Error in task for idea ${task.idea.id}:`, err);
          
          // Retry logic
          if (task.retryCount < this.maxRetries) {
            task.retryCount++;
            console.log(`Retrying task for idea ${task.idea.id}, attempt ${task.retryCount + 1}/${this.maxRetries + 1}`);
            task.execute = () => this._generateImage(task.idea, task.regenerate, task.retryCount);
            this.queue.unshift(task); // Add back to front of queue
          } else if (task.reject) {
            task.reject(err);
          }
        })
        .finally(() => {
          this.active.delete(p);
          if (this.queue.length) {
            // Process next task with a small delay to prevent API rate limiting
            setTimeout(() => {
              this._start(this.queue.shift());
            }, 200);
          }
        });
      
      this.active.add(p);
    }
  
    async _generateImage(idea, regenerate = false, retryCount = 0) {
      try {
        // Update status to processing if not a retry
        if (retryCount === 0) {
          await this.pool.execute(
            'UPDATE thumbnails SET status = ? WHERE idea_id = ?',
            ['processing', idea.id]
          );
        }
        
        // Add retry information to the prompt for better results on retries
        let enhancedPrompt = idea.fullPrompt;
        if (retryCount > 0) {
          enhancedPrompt = `${idea.fullPrompt} [IMPORTANT: This is retry #${retryCount}, please make sure the image is clear, high quality, and follows all instructions carefully]`;
        }
        
        // Use the most appropriate references
        const selectedReferences = this._selectBestReferences(this.references);
        
        const imageResult = await this.openAIService.generateImage(
          idea.id,
          enhancedPrompt,
          selectedReferences
        );
        
        await this.pool.execute(
          'UPDATE thumbnails SET status = ?, image_url = ? WHERE idea_id = ?',
          ['completed', imageResult.imageUrl, idea.id]
        );
        
        return imageResult;
      } catch (err) {
        // If we've run out of retries, mark as failed
        if (retryCount >= this.maxRetries) {
          await this.pool.execute(
            'UPDATE thumbnails SET status = ?, error_message = ? WHERE idea_id = ?',
            ['failed', `Failed after ${retryCount + 1} attempts: ${err.message ? err.message.substring(0, 200) : 'Unknown error'}`, idea.id]
          );
        }
        throw err;
      }
    }
    
    // Helper method to select a subset of references for better performance
    _selectBestReferences(references) {
      if (!references || references.length <= 3) {
        return references; // Use all if we have 3 or fewer
      }
      
      // Select up to 3 references to avoid overwhelming the API
      // In a production system, you'd use a more sophisticated selection algorithm
      return references.slice(0, 3);
    }
  }
  
  module.exports = ThumbnailDispatcher;
  