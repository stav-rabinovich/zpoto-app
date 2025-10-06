import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

/**
 * GET /api/recent-searches
 * קבלת חיפושים אחרונים של המשתמש
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const recentSearches = await prisma.recentSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50) // מקסימום 50
    });
    
    res.json({ data: recentSearches });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/recent-searches
 * הוספת חיפוש חדש לרשימה
 */
r.post('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { query, lat, lng } = req.body;

    // ולידציה
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = query.trim();

    // בדיקה אם החיפוש כבר קיים (למנוע כפילויות)
    const existingSearch = await prisma.recentSearch.findFirst({
      where: { 
        userId, 
        query: searchQuery 
      }
    });

    if (existingSearch) {
      // עדכון התאריך של החיפוש הקיים
      const updatedSearch = await prisma.recentSearch.update({
        where: { id: existingSearch.id },
        data: { 
          createdAt: new Date(),
          ...(lat !== undefined && { lat }),
          ...(lng !== undefined && { lng })
        }
      });
      
      return res.json({ data: updatedSearch });
    }

    // יצירת חיפוש חדש
    const recentSearch = await prisma.recentSearch.create({
      data: {
        userId,
        query: searchQuery,
        lat: lat || null,
        lng: lng || null
      }
    });

    // שמירה על מקסימום 20 חיפושים אחרונים
    const searchCount = await prisma.recentSearch.count({
      where: { userId }
    });

    if (searchCount > 20) {
      // מחיקת החיפושים הישנים ביותר
      const oldSearches = await prisma.recentSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: searchCount - 20
      });

      if (oldSearches.length > 0) {
        await prisma.recentSearch.deleteMany({
          where: {
            id: { in: oldSearches.map(s => s.id) }
          }
        });
      }
    }

    res.status(201).json({ data: recentSearch });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/recent-searches/:id
 * מחיקת חיפוש ספציפי
 */
r.delete('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const searchId = parseInt(req.params.id);

    if (isNaN(searchId)) {
      return res.status(400).json({ error: 'Invalid search ID' });
    }

    // וידוא שהחיפוש שייך למשתמש
    const existingSearch = await prisma.recentSearch.findFirst({
      where: { id: searchId, userId }
    });

    if (!existingSearch) {
      return res.status(404).json({ error: 'Recent search not found' });
    }

    await prisma.recentSearch.delete({
      where: { id: searchId }
    });

    res.json({ message: 'Recent search deleted successfully' });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/recent-searches
 * מחיקת כל החיפושים האחרונים
 */
r.delete('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    
    const result = await prisma.recentSearch.deleteMany({
      where: { userId }
    });

    res.json({ 
      message: 'All recent searches deleted successfully',
      deletedCount: result.count 
    });
  } catch (e) {
    next(e);
  }
});

export default r;
