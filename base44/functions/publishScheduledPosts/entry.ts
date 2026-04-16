import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all unpublished posts that have a scheduled_at in the past
    const allPosts = await base44.asServiceRole.entities.BlogPost.filter({ published: false });
    const now = new Date();

    const toPublish = allPosts.filter(post => {
      if (!post.scheduled_at) return false;
      return new Date(post.scheduled_at) <= now;
    });

    let published = 0;
    for (const post of toPublish) {
      await base44.asServiceRole.entities.BlogPost.update(post.id, {
        published: true,
        scheduled_at: null,
      });
      published++;
    }

    return Response.json({ published, checked: allPosts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});