const { pool } = require('../database');
const openRouterService = require('../services/openRouterService');
const openAIService = require('../services/openAIService');
const ThumbnailDispatcher = require('../services/ThumbnailDispatcher');
const MAX_PARALLEL = 5;
// Generate thumbnail ideas (parallel processing)
async function generateThumbnails(req, res) {
  if (!req.user || !req.user.id) {
    console.error('User not authenticated properly');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { titleId, quantity = 5 } = req.body;
  
  if (!titleId) {
    return res.status(400).json({ error: 'Title ID is required' });
  }
  
  try {
    // Get title info
    const titleParams = [titleId];
    if (titleParams.some(p => p === undefined)) {
      console.error('Attempted to execute query with undefined parameter:', { titleParams });
      return res.status(500).json({ error: 'Internal server error: Invalid query parameter detected' });
    }
    
    const [titleRows] = await pool.execute(
      'SELECT id, title, instructions FROM titles WHERE id = ?',
      titleParams
    );
    
    if (titleRows.length === 0) {
      return res.status(404).json({ error: 'Title not found' });
    }
    
    const title = titleRows[0];
    
    // Get reference images
    const refParams = [titleId, req.user.id];
    if (refParams.some(p => p === undefined)) {
      console.error('Attempted to execute query with undefined parameter:', { refParams });
      return res.status(500).json({ error: 'Internal server error: Invalid query parameter detected' });
    }
    
    const [refRows] = await pool.execute(
      'SELECT id, image_data FROM references2 WHERE title_id = ? OR (user_id = ? AND is_global = 1)',
      refParams
    );
    
    const references = refRows.map(row => ({ id: row.id, image_data: row.image_data }));

    // Get previous ideas for this title to avoid duplication
    const prevParams = [titleId];
    if (prevParams.some(p => p === undefined)) {
      console.error('Attempted to execute query with undefined parameter:', { prevParams });
      return res.status(500).json({ error: 'Internal server error: Invalid query parameter detected' });
    }
    
    const [prevIdeas] = await pool.execute(
      'SELECT id, summary FROM ideas WHERE title_id = ? ORDER BY created_at DESC',
      prevParams
    );
    
    // Create dispatcher for background processing
    const dispatcher = new ThumbnailDispatcher({ 
      maxParallel: MAX_PARALLEL, 
      pool, 
      openAIService, 
      references 
    });

    // First generate the ideas synchronously to get their IDs
    console.log(`Generating ${quantity} initial ideas`);
    const ideaPromises = Array.from({ length: quantity }).map(() =>
      openRouterService.generateIdeas(titleId, title.title, title.instructions, [...prevIdeas])
        .catch(err => {
          console.warn("generateIdeas failed:", err.message);
          return null;
        })
    );
    
    const ideaResults = await Promise.all(ideaPromises);
    const validIdeas = ideaResults.filter(i => i !== null);
    
    // Now create thumbnails with the idea IDs
    const thumbnailIds = [];
    for (let i = 0; i < validIdeas.length; i++) {
      const [result] = await pool.execute(
        `INSERT INTO thumbnails (title_id, idea_id, status)
        VALUES (?, ?, 'pending')`,
        [titleId, validIdeas[i].id]
      );
      thumbnailIds.push(result.insertId);
    }
    
    // Start generating images in the background
    process.nextTick(async () => {
      try {
        // Enqueue all ideas for image generation
        for (const idea of validIdeas) {
          dispatcher.enqueue(idea);
        }
        
        // If we didn't get enough ideas, try to generate more
        if (validIdeas.length < quantity) {
          console.log(`Only generated ${validIdeas.length} valid ideas out of ${quantity} requested. Trying to generate ${quantity - validIdeas.length} more.`);
          
          // Try up to 2 more times to get the remaining ideas
          let remainingToGenerate = quantity - validIdeas.length;
          let additionalIdeas = [];
          
          for (let attempt = 0; attempt < 2 && remainingToGenerate > 0; attempt++) {
            const additionalPromises = Array.from({ length: remainingToGenerate * 2 }).map(() =>
              openRouterService.generateIdeas(titleId, title.title, title.instructions, [...prevIdeas, ...validIdeas, ...additionalIdeas])
                .catch(err => {
                  console.warn(`Additional idea generation failed (attempt ${attempt + 1}):`, err.message);
                  return null;
                })
            );
            
            const additionalResults = await Promise.all(additionalPromises);
            const newValidIdeas = additionalResults.filter(i => i !== null).slice(0, remainingToGenerate);
            
            if (newValidIdeas.length === 0) {
              console.warn(`No additional valid ideas generated in attempt ${attempt + 1}`);
              break;
            }
            
            // Create thumbnails for the additional ideas
            for (const idea of newValidIdeas) {
              const [result] = await pool.execute(
                `INSERT INTO thumbnails (title_id, idea_id, status)
                VALUES (?, ?, 'pending')`,
                [titleId, idea.id]
              );
              thumbnailIds.push(result.insertId);
              
              // Start processing the thumbnail
              dispatcher.enqueue(idea);
            }
            
            additionalIdeas.push(...newValidIdeas);
            remainingToGenerate = quantity - (validIdeas.length + additionalIdeas.length);
          }
        }
      } catch (error) {
        console.error('Error in background thumbnail generation:', error);
      }
    });

    // Return immediately with the thumbnail IDs
    res.status(200).json({
      message: `Started generating ${thumbnailIds.length} thumbnails`,
      thumbnailIds
    });
  } catch (error) {
    console.error('Error in generateThumbnails:', error);
    res.status(500).json({ error: 'Failed to generate thumbnails', error: error.message });
    
  }
}


async function regenerateThumbnail(req, res) {
  if (!req.user || !req.user.id) {
    console.error('User not authenticated properly');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { titleId, thumbnailId } = req.body;
  
  if (!thumbnailId || !titleId) {
    return res.status(400).json({ error: 'Both Title ID and Thumbnail ID are required' });
  }
  
  try {
    // Get the existing thumbnail and its corresponding idea
    const [thumbnailRows] = await pool.execute(
      'SELECT t.id, t.title_id, i.id as idea_id, i.summary, i.full_prompt as fullPrompt ' +
      'FROM thumbnails t ' +
      'JOIN ideas i ON t.idea_id = i.id ' +
      'WHERE t.id = ?',
      [thumbnailId]
    );
    
    if (thumbnailRows.length === 0) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    const thumbnail = thumbnailRows[0];
    const ideaId = thumbnail.idea_id;
    
    // Get reference images (same as in generateThumbnails)
    const [refRows] = await pool.execute(
      'SELECT id, image_data FROM references2 WHERE title_id = ? OR (user_id = ? AND is_global = 1)',
      [titleId, req.user.id]
    );
    
    const references = refRows.map(row => ({ id: row.id, image_data: row.image_data }));
    
    // Create a dispatcher with just one item
    const dispatcher = new ThumbnailDispatcher({
      maxParallel: 1, // Only one item to process
      pool,
      openAIService,
      references
    });
    
    // Update thumbnail status to processing
    await pool.execute(
      'UPDATE thumbnails SET status = ?, image_url = NULL WHERE id = ?',
      ['processing', thumbnailId]
    );
    
    // Use the existing idea but regenerate the image
    const idea = {
      id: ideaId,
      fullPrompt: thumbnail.fullPrompt,
      summary: thumbnail.summary,
      titleId: titleId // Add titleId which is required by the dispatcher
    };
    
    // Enqueue the idea - this will automatically start processing
    await dispatcher.enqueue(idea, true);
    
    // Return immediately
    res.status(200).json({
      message: `Started regenerating thumbnail ${thumbnailId}`,
      thumbnail: {
        id: thumbnailId,
        status: 'processing',
        title_id: titleId,
        summary: thumbnail.summary
      }
    });
  } catch (error) {
    console.error('Error in regenerateThumbnail:', error);
    res.status(500).json({ error: 'Failed to regenerate thumbnail: ' + error.message });
  }
}
// Get status of all thumbnails for a title
async function getThumbnails(req, res) {
  if (!req.user || !req.user.id) {
    console.error('User not authenticated properly');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { titleId } = req.params;
  const functionStartTime = Date.now(); 
  let stepStartTime = Date.now();

  if (!titleId) {
    return res.status(400).json({ error: 'Title ID is required' });
  }
  console.log(`[Title ID: ${titleId}] getThumbnails started.`);

  try {
    const titleCheckParams = [titleId];
    if (titleCheckParams.some(p => p === undefined)) {
      console.error('Attempted to execute query with undefined parameter:', { titleCheckParams });
      return res.status(500).json({ error: 'Internal server error: Invalid query parameter detected' });
    }
    
    const [titleCheck] = await pool.execute(
      'SELECT id FROM titles WHERE id = ?',
      titleCheckParams
    );
    if (titleCheck.length === 0) {
      console.warn(`[Title ID: ${titleId}] Title not found during initial check.`);
      return res.status(404).json({ error: 'Title not found' });
    }
    console.log(`[Title ID: ${titleId}] Title existence check completed in ${Date.now() - stepStartTime}ms.`);
    stepStartTime = Date.now(); 
    
    const thumbnailQuery = `
      SELECT t.id, t.title_id, t.idea_id, t.image_url, t.status, t.created_at, t.error_message,
             t.used_reference_ids,
             i.summary, i.full_prompt as fullPrompt,
             titles.title as title_text, 
             titles.instructions as title_instructions
      FROM thumbnails t
      JOIN ideas i ON t.idea_id = i.id
      JOIN titles ON t.title_id = titles.id
      WHERE t.title_id = ?
      ORDER BY t.created_at DESC
    `;
    
    const thumbnailParams = [titleId];
    if (thumbnailParams.some(p => p === undefined)) {
      console.error('Attempted to execute query with undefined parameter:', { thumbnailParams });
      return res.status(500).json({ error: 'Internal server error: Invalid query parameter detected' });
    }
    
    const [thumbnailRows] = await pool.execute(thumbnailQuery, thumbnailParams);
    console.log(`[Title ID: ${titleId}] Initial thumbnail query fetched ${thumbnailRows ? thumbnailRows.length : 0} rows in ${Date.now() - stepStartTime}ms.`);
    stepStartTime = Date.now();

    if (!thumbnailRows || thumbnailRows.length === 0) {
      console.log(`[Title ID: ${titleId}] No thumbnails found. Total time: ${Date.now() - functionStartTime}ms.`);
      return res.status(200).json({ thumbnails: [], referenceDataMap: {} }); // Return empty map
    }

    const allReferenceIds = new Set();
    thumbnailRows.forEach(row => {
      if (row.used_reference_ids) {
        try {
          const refIds = JSON.parse(row.used_reference_ids);
          if (refIds && Array.isArray(refIds)) {
            refIds.forEach(id => {
              if (id != null) allReferenceIds.add(id);
            });
          }
        } catch (e) {
          console.error(`[Title ID: ${titleId}] Error parsing used_reference_ids for thumbnail ${row.id} (value: '${row.used_reference_ids}'):`, e.message);
        }
      }
    });
    console.log(`[Title ID: ${titleId}] Collected ${allReferenceIds.size} unique reference IDs in ${Date.now() - stepStartTime}ms.`);
    stepStartTime = Date.now();

    let serverReferenceDataMap = {}; // Changed to object for JSON response
    const uniqueRefIdsArray = Array.from(allReferenceIds);

    if (uniqueRefIdsArray.length > 0) {
      try {
        const placeholders = uniqueRefIdsArray.map(() => '?').join(',');
        
        // Validate all parameters before executing query
        if (uniqueRefIdsArray.some(p => p === undefined)) {
          console.error('Attempted to execute query with undefined parameter in reference IDs:', { uniqueRefIdsArray });
          // Continue without reference data rather than failing the entire request
        } else {
          const [actualRefDataRows] = await pool.execute(
            `SELECT id, image_data FROM references2 WHERE id IN (${placeholders})`,
            uniqueRefIdsArray
          );
          actualRefDataRows.forEach(refRow => {
            serverReferenceDataMap[refRow.id] = refRow.image_data; // Populate object
          });
          console.log(`[Title ID: ${titleId}] Bulk fetched ${Object.keys(serverReferenceDataMap).length} reference data items in ${Date.now() - stepStartTime}ms.`);
        }
      } catch (refQueryError) {
          console.error(`[Title ID: ${titleId}] Error fetching bulk reference data:`, refQueryError);
          console.log(`[Title ID: ${titleId}] Proceeding without detailed reference images due to bulk fetch error. Time before error: ${Date.now() - stepStartTime}ms.`);
      }
    }
    stepStartTime = Date.now();

    const thumbnailsWithDetails = thumbnailRows.map(row => {
      let usedRefIdsList = [];
      let referenceCount = 0;

      if (row.used_reference_ids) {
        try {
          const refIds = JSON.parse(row.used_reference_ids);
          if (refIds && Array.isArray(refIds) && refIds.length > 0) {
            usedRefIdsList = refIds.filter(id => id != null && serverReferenceDataMap.hasOwnProperty(id));
            referenceCount = usedRefIdsList.length;
          }
        } catch (e) { /* Error already logged */ }
      }
      
      const promptDetails = {
        summary: row.summary || '',
        title: row.title_text || 'Unknown Title',
        instructions: row.title_instructions || 'No custom instructions provided',
        referenceCount: referenceCount,
        referenceImages: usedRefIdsList, // Now an array of IDs
        fullPrompt: row.fullPrompt || ''
      };

      return {
        id: row.id,
        idea_id: row.idea_id,
        title_id: row.title_id,
        image_url: row.image_url || '',
        status: row.status || 'unknown',
        created_at: row.created_at || new Date(),
        error_message: row.error_message || '',
        summary: row.summary || '',
        promptDetails: promptDetails
      };
    });
    console.log(`[Title ID: ${titleId}] Mapped thumbnails to details in ${Date.now() - stepStartTime}ms.`);
    
    console.log(`[Title ID: ${titleId}] getThumbnails completed successfully in ${Date.now() - functionStartTime}ms.`);
    res.status(200).json({ thumbnails: thumbnailsWithDetails, referenceDataMap: serverReferenceDataMap });

  } catch (error) {
    console.error(`[Title ID: ${titleId}] Critical error in getThumbnails (total time: ${Date.now() - functionStartTime}ms):`, error);
    res.status(500).json({ error: `Failed to get thumbnails: ${error.message}` });
  }
}

// Get a single thumbnail by ID
async function getThumbnailById(req, res) {
  if (!req.user || !req.user.id) {
    console.error('User not authenticated properly');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { thumbnailId } = req.params;

  if (!thumbnailId) {
    return res.status(400).json({ error: 'Thumbnail ID is required' });
  }

  try {
    const thumbnailQuery = `
      SELECT t.id, t.title_id, t.idea_id, t.image_url, t.status, t.created_at, t.error_message,
             t.used_reference_ids,
             i.summary, i.full_prompt as fullPrompt,
             titles.title as title_text, 
             titles.instructions as title_instructions
      FROM thumbnails t
      JOIN ideas i ON t.idea_id = i.id
      JOIN titles ON t.title_id = titles.id
      WHERE t.id = ?
    `;

    const [thumbnailRows] = await pool.execute(thumbnailQuery, [thumbnailId]);

    if (!thumbnailRows || thumbnailRows.length === 0) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const row = thumbnailRows[0];
    let usedRefIdsList = [];
    let referenceCount = 0;

    if (row.used_reference_ids) {
      try {
        const refIds = JSON.parse(row.used_reference_ids);
        if (refIds && Array.isArray(refIds) && refIds.length > 0) {
          usedRefIdsList = refIds.filter(id => id != null);
          referenceCount = usedRefIdsList.length;
        }
      } catch (e) {
        console.error(`Error parsing used_reference_ids for thumbnail ${row.id}:`, e.message);
      }
    }

    // Get reference images if any were used
    let referenceDataMap = {};
    if (usedRefIdsList.length > 0) {
      const placeholders = usedRefIdsList.map(() => '?').join(',');
      const [refDataRows] = await pool.execute(
        `SELECT id, image_data FROM references2 WHERE id IN (${placeholders})`,
        usedRefIdsList
      );
      refDataRows.forEach(refRow => {
        referenceDataMap[refRow.id] = refRow.image_data;
      });
    }

    const promptDetails = {
      summary: row.summary || '',
      title: row.title_text || 'Unknown Title',
      instructions: row.title_instructions || 'No custom instructions provided',
      referenceCount: referenceCount,
      referenceImages: usedRefIdsList,
      fullPrompt: row.fullPrompt || ''
    };

    const thumbnail = {
      id: row.id,
      idea_id: row.idea_id,
      title_id: row.title_id,
      image_url: row.image_url || '',
      status: row.status || 'unknown',
      created_at: row.created_at || new Date(),
      error_message: row.error_message || '',
      summary: row.summary || '',
      promptDetails: promptDetails
    };

    res.status(200).json({ thumbnail, referenceDataMap });
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    res.status(500).json({ error: `Failed to get thumbnail: ${error.message}` });
  }
}

// GET /thumbnails/batch/:ids
async function getThumbnailsByIds(req, res) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Parse comma-separated list from route params
  const ids = (req.params.ids || '')
    .split(',')
    .map(id => parseInt(id, 10))
    .filter(id => !isNaN(id));

  // console.log(`Processing request for thumbnail IDs: ${ids.join(', ')}`);

  if (!ids.length) {
    return res.status(400).json({ error: 'No valid thumbnail IDs provided' });
  }

  try {
    // fetch all the rows we need
    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT
        t.id, t.title_id, t.idea_id, t.image_url, t.status,
        t.error_message, t.used_reference_ids, t.created_at,
        i.summary, i.full_prompt AS fullPrompt,
        titles.title       AS title_text,
        titles.instructions AS title_instructions
      FROM thumbnails t
      JOIN ideas    i ON t.idea_id  = i.id
      JOIN titles   ON t.title_id = titles.id
      WHERE t.id IN (${placeholders})
    `;
    const [rows] = await pool.execute(query, ids);
    
    console.log(`Found ${rows.length} thumbnails for IDs: ${ids.join(', ')}`);

    // build a map of used reference images for all thumbnails in one go
    const allRefIds = rows
      .flatMap(r => {
        try { return JSON.parse(r.used_reference_ids) || []; }
        catch { return []; }
      })
      .filter((v, i, a) => v != null && a.indexOf(v) === i);

    let referenceDataMap = {};
    if (allRefIds.length) {
      const refPlaceholders = allRefIds.map(() => '?').join(',');
      const [refRows] = await pool.execute(
        `SELECT id, image_data FROM references2 WHERE id IN (${refPlaceholders})`,
        allRefIds
      );
      referenceDataMap = Object.fromEntries(refRows.map(r => [r.id, r.image_data]));
    }

    // now map each row into a full object
    const thumbnails = rows.map(row => {
      let usedRefs = [];
      try {
        usedRefs = JSON.parse(row.used_reference_ids) || [];
      } catch {}
      const promptDetails = {
        summary:       row.summary || '',
        title:         row.title_text || 'Unknown Title',
        instructions:  row.title_instructions || 'No custom instructions provided',
        referenceCount: usedRefs.length,
        referenceImages: usedRefs.map(id => referenceDataMap[id]).filter(Boolean),
        fullPrompt:    row.fullPrompt || ''
      };

      return {
        id:           row.id,
        idea_id:      row.idea_id,
        title_id:     row.title_id,
        image_url:    row.image_url || '',
        status:       row.status || 'unknown',
        created_at:   row.created_at || new Date(),
        error_message: row.error_message || '',
        summary:      row.summary || '',
        promptDetails
      };
    });

    return res.json({ thumbnails, referenceDataMap });

  } catch (err) {
    console.error('Error in getThumbnailsByIds:', err);
    res.status(500).json({ error: `Failed to fetch thumbnails: ${err.message}` });
  }
}



module.exports = {
  generateThumbnails,
  getThumbnails,
  regenerateThumbnail,
  getThumbnailById,
  getThumbnailsByIds
}; 