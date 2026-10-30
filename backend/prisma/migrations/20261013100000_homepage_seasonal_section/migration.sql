-- Homepage "seasonal products" carousel (products whose season attribute
-- option matches the current season — see src/lib/season.ts).
ALTER TYPE "dbo"."HomepageSectionType" ADD VALUE 'SEASONAL_PRODUCTS';
