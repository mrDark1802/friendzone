import { Request, Response, NextFunction } from 'express';
import { TranslationService } from './translation.service.js';

const translationService = new TranslationService();

export async function getWordBreakdownHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { originalText, translatedText, sourceLanguage, targetLanguage } = req.body;

    if (!originalText || !translatedText) {
      res.status(400).json({ error: 'originalText and translatedText are required' });
      return;
    }

    const breakdown = await translationService.getWordBreakdown(
      String(originalText),
      String(translatedText),
      String(sourceLanguage || 'auto'),
      String(targetLanguage || 'en')
    );

    res.status(200).json({ success: true, breakdown });
  } catch (error) {
    next(error);
  }
}
