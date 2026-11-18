#!/usr/bin/env python3
"""Build try_activities.json (TRY schema v1) — first 10 activities, parent-approved 17 Nov 2026."""
import json
FAM = [("move_and_play","Move & Play","🤸","#E8590C"),("create_and_make","Create & Make","🎨","#B23A86"),
       ("nature_and_notice","Nature & Notice","🍃","#2F7D4A"),("think_and_discover","Think & Discover","🔍","#5B47C9"),
       ("help_and_everyday","Help & Everyday","🧦","#1D7468"),("family_and_connect","Family & Connect","👪","#C9730A"),
       ("calm_and_mindful","Calm Moments","🌙","#2B6CC4")]
H = ["choking_small_parts","sharp_tools","heat_fire","electricity","chemicals","food_allergy_choking","water_slip",
     "outdoor_environment","animal_plant_insect","exertion_fall","privacy_disclosure","adult_involvement"]
def rev(**m): return {h: m.get(h, "none") for h in H}
def st(pic, text, say): return {"pic": pic, "text": text, "say": say}
A = []
def add(i, cat, pic, title, desc, say, ages, dur, mats, adult, steps, safety, adapt, acc, tags, review, indoor=None, outdoor=None, setup=None):
    A.append({"schema_version":1,"activity_id":i,"title":title,"short_description":desc,"say":say,"pic":pic,"category":cat,
      "subcategories":[],"recommended_age_bands":ages,"difficulty":"easy","duration_minutes":{"min":dur[0],"max":dur[1]},
      "screen_intro_seconds":45,"learning_intentions":[],"materials":mats,"setup_steps":setup or [],"child_steps":steps,
      "adult_support":adult,"safety_notes":safety,"adaptations_by_age":adapt,"accessibility_adaptations":acc,
      "indoor_alternative":indoor,"outdoor_alternative":outdoor,"video_topic_tags":tags,
      "language_variants":{"en":{"title":title},"kn":{},"hi":{}},"illustration_asset":None,"audio_asset":None,
      "parent_review_required":True,"safety_review":review,"safety_status":"approved","content_status":"reviewed",
      "approved_by":"parent, 17 Nov 2026"})
add("TRY-MOVE-001","move_and_play","🐘","Move Like an Animal","Pick an animal and move like it.","Pick an animal and move just like it!",
  ["3-4","5-6","7-8"],(3,5),[],"optional",
  [st("🐘","Pick an animal","Pick an animal. An elephant? A rabbit? A tortoise?"),st("🐢","Move slowly like it","Move slowly, like a tortoise."),
   st("🐇","Now move fast","Now hop quickly, like a rabbit!"),st("🦁","Make its sound, softly","Make your animal's sound, softly. Roar!")],
  ["Clear a little floor space first.","Walk, don't run, near furniture. No jumping off things."],
  {"3-4":"Copy one animal a grown-up shows.","5-6":"Pick and switch animals.","7-8":"Invent an animal and its move."},
  ["Seated: move arms, head and hands only.","Picture steps need no reading."],["animals","movement"],rev(exertion_fall="mitigated"))
add("TRY-MOVE-002","move_and_play","🐭","Loud Feet, Quiet Feet","Walk like a giant, then like a mouse.","Walk like a giant, then tiptoe like a mouse!",
  ["3-4","5-6"],(2,4),[],"optional",
  [st("🦶","Stand in a clear spot","Stand in a clear spot."),st("🐘","Giant steps, loud feet","Giant steps! Stomp, stomp, stomp!"),
   st("🐭","Mouse steps, quiet feet","Now mouse steps. Quiet, quiet feet."),st("👏","Swap when someone claps","When someone claps, swap!")],
  ["Indoors on a dry floor; bare feet, not socks, on smooth tiles.","Stay away from stairs."],
  {"3-4":"Giant and mouse only.","5-6":"Add tiptoe cat steps.","7-8":"Lead the claps for a younger child."},
  ["Seated: tap hands loud and quiet on the lap."],["animals","music","opposites"],rev(water_slip="mitigated",exertion_fall="mitigated"))
add("TRY-MOVE-003","move_and_play","👯","Mirror Me","Face your partner and copy every move.","Face your partner. Copy every move, like a mirror!",
  ["5-6","7-8","9-10"],(3,5),[{"pic":"👫","name":"a partner","kind":"none"}],"recommended",
  [st("👫","Stand face to face","Stand face to face with your partner."),st("🙋","One moves slowly","One person moves slowly."),
   st("🔁","The other copies","The other copies, like a mirror."),st("🔄","Swap who leads","Now swap who leads!")],
  ["Slow moves only; stay an arm's length apart."],
  {"5-6":"Arms and faces.","7-8":"Whole body, very slowly.","9-10":"Add a mystery move the mirror must guess."},
  ["Works fully seated.","The partner can be any family member, trusted adult or sibling."],["movement","body","family"],rev(adult_involvement="mitigated"))
add("TRY-CREATE-001","create_and_make","🐙","A Creature Nobody Has Seen","Draw a creature nobody has ever seen.","Draw a creature that nobody has ever seen!",
  ["3-4","5-6","7-8","9-10"],(5,10),[{"pic":"📄","name":"paper","kind":"household"},{"pic":"🖍️","name":"crayons","kind":"household"}],"optional",
  [st("📄","Get paper and crayons","Get some paper and crayons."),st("🐙","Give it funny legs","Give your creature some funny legs."),
   st("👀","How many eyes?","How many eyes does it have?"),st("🏷️","Give it a name","Now give your creature a name!")],
  ["Crayons rather than pens with small caps for under-4s."],
  {"3-4":"Scribble a creature and say its name.","5-6":"Mix parts from three animals.","9-10":"Draw where it lives and what it eats."},
  ["Can be made from paper shapes a grown-up cuts.","Telling it aloud counts too."],["animals","imagination","art"],rev(choking_small_parts="mitigated"))
add("TRY-CREATE-002","create_and_make","🧸","A Home for a Toy","Your toy needs a house. Build one!","Your toy needs a house. Can you build one?",
  ["3-4","5-6","7-8"],(5,15),[{"pic":"🛋️","name":"cushions","kind":"household"},{"pic":"📦","name":"boxes","kind":"household"}],"optional",
  [st("🧸","Pick a toy","Pick a toy that needs a home."),st("🛋️","Find cushions or boxes","Find cushions or empty boxes."),
   st("🏠","Build walls and a roof","Build walls and a roof."),st("🚪","Make a door","Make a door so your toy can go in!")],
  ["Soft things and empty cardboard only; no stacking above shoulder height.","A grown-up checks boxes for staples."],
  {"3-4":"A cushion cave.","5-6":"Walls, a roof and a door.","7-8":"Add a garden or a second room."},
  ["Table-top version with blocks or folded paper."],["homes","building","animals"],rev(exertion_fall="mitigated",sharp_tools="mitigated"))
add("TRY-NATURE-001","nature_and_notice","☁️","Cloud Shapes","Look at the sky. What shapes can you see?","Look at the sky. What shapes can you see in the clouds?",
  ["3-4","5-6","7-8","9-10"],(3,5),[],"optional",
  [st("🏠","Go to a window","Go to a window."),st("☁️","Find one big cloud","Find one big cloud."),
   st("🐑","What does it look like?","What does it look like? A sheep? A dragon?"),st("👀","Watch it change","Watch it slowly change shape.")],
  ["Never look at the sun.","Stay inside at the window, or go out with a grown-up."],
  {"3-4":"Find a cloud.","5-6":"Name its shape.","7-8":"Notice which way the clouds move."},
  ["If the sky is clear, notice birds, trees or the sky's colour instead.","Seated by the window works."],["weather","sky","space"],rev(outdoor_environment="mitigated"))
add("TRY-THINK-001","think_and_discover","⚽","Which Rolls Farther?","Guess which one rolls the farthest!","Guess which one will roll the farthest. Then try it!",
  ["5-6","7-8"],(5,10),[{"pic":"⚽","name":"a ball","kind":"household"},{"pic":"🍊","name":"an orange","kind":"household"},{"pic":"🥛","name":"a steel tumbler","kind":"household"}],"recommended",
  [st("⚽","Get three things","Get a ball, an orange and a steel tumbler."),st("🤔","Guess the winner","Which one will roll the farthest? Guess!"),
   st("👉","Roll each one gently","Roll each one gently on the floor."),st("👀","Which went farthest?","Which one went the farthest? Were you surprised?")],
  ["Flat floor away from stairs and glass; steel tumbler, not glass.","No marbles or small balls."],
  {"5-6":"Three things and a guess.","7-8":"Try a slope made from a book."},
  ["A grown-up can roll while the child guesses and watches.","Seated works."],["science","forces","toys"],rev(choking_small_parts="mitigated",adult_involvement="mitigated"))
add("TRY-HELP-001","help_and_everyday","🧦","Sock Partners","These socks lost their partners. Help them!","These socks lost their partners. Can you help them?",
  ["3-4","5-6","7-8"],(5,5),[{"pic":"🧦","name":"clean socks","kind":"household"}],"optional",
  [st("🧦","Get clean socks","Get a pile of clean socks."),st("🔍","Find two the same","Find two that are the same."),
   st("🤝","Put partners together","Put the partners together."),st("🧺","Put them in the basket","Put them in the basket. All done!")],
  ["Clean, dry laundry only; keep away from detergent."],
  {"3-4":"Match by colour.","5-6":"Match by colour and pattern.","7-8":"Sort them by who they belong to."},
  ["Works seated.","Match by touch for a child with low vision."],["home","sorting","matching"],rev(chemicals="mitigated"))
add("TRY-FAMILY-001","family_and_connect","📖","Story Chain","Make a story together, one bit each.","Make a story together. You say one bit, they say the next!",
  ["5-6","7-8","9-10"],(5,10),[{"pic":"👪","name":"a family member","kind":"none"}],"required",
  [st("👪","Sit with someone","Sit with a family member or a grown-up you trust."),st("🗣️","You say the first bit","You start: Once upon a time..."),
   st("👂","They add the next bit","Now they add the next bit."),st("🔁","Take turns to the end","Take turns until the story ends!")],
  ["No personal questions or secrets."],
  {"5-6":"Three turns each.","7-8":"Add a problem the hero must solve.","9-10":"The story must use three chosen objects."},
  ["A picture card like monkey, tree and bus can start it.","Signs and gestures count as turns."],["stories","family","language"],rev(adult_involvement="mitigated"))
add("TRY-CALM-001","calm_and_mindful","👀","Five Things I Can See","Look around slowly. Find five things.","Look around slowly. Can you find five things?",
  ["3-4","5-6","7-8","9-10"],(2,3),[],"optional",
  [st("🛋️","Sit comfortably","Sit or stand comfortably."),st("💙","Find something blue","Find something blue."),
   st("⚽","Find something round","Find something round."),st("✋","Count five things","Now count five things you can see!")],
  ["No eyes-closed or breathing instructions; stop any time."],
  {"3-4":"Find two things with a grown-up.","5-6":"Five things.","9-10":"Five things, then three sounds."},
  ["A child with low vision can find five things to touch or hear."],["calm","colours","shapes"],rev())
out={"schema_version":1,"families":[{"id":i,"name":n,"icon":ic,"color":c} for i,n,ic,c in FAM],
     "lines":{"home":"Let's do something in the real world!","away":"Now go and try it. You don't need to stay here.","notice":"What did you notice?","rest":"Time to rest."},
     "activities":A}
json.dump(out,open('try_activities.json','w'),ensure_ascii=False,indent=1); print(len(A),"activities")
