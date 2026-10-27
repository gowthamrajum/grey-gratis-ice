"""
Builds trivia/questions.json — Bible trivia, 4 options each, the right one
recorded. Each row: question, correct answer, three wrong answers, the verse
that settles it, category, difficulty. The correct answer's position is
spread across A–D (seeded, so the file is the same every run) rather than
left where it was typed.

    python3 trivia/build-questions.py
"""
import json, random
from pathlib import Path

OT, NT, GEN = "Old Testament", "New Testament", "General"
Q = [
  # ---- easy · Old Testament ----
  ("Who built the ark?", "Noah", ["Moses", "Abraham", "David"], "Genesis 6:14", OT, "easy"),
  ("In how many days did God create the heavens and the earth before He rested?", "6", ["7", "5", "3"], "Genesis 2:2", OT, "easy"),
  ("Who was swallowed by a great fish?", "Jonah", ["Elijah", "Peter", "Daniel"], "Jonah 1:17", OT, "easy"),
  ("Who killed the giant Goliath?", "David", ["Saul", "Samson", "Jonathan"], "1 Samuel 17:50", OT, "easy"),
  ("Who led the Israelites out of Egypt?", "Moses", ["Aaron", "Joshua", "Abraham"], "Exodus 3:10", OT, "easy"),
  ("What was the name of Abraham's wife?", "Sarah", ["Rebekah", "Rachel", "Leah"], "Genesis 17:15", OT, "easy"),
  ("Who was thrown into the lions' den?", "Daniel", ["Joseph", "Jeremiah", "Shadrach"], "Daniel 6:16", OT, "easy"),
  ("Who was sold into slavery by his brothers?", "Joseph", ["Benjamin", "Reuben", "Esau"], "Genesis 37:28", OT, "easy"),
  ("What did God create on the first day?", "Light", ["Plants", "Animals", "The sun"], "Genesis 1:3", OT, "easy"),
  ("Who was the first man?", "Adam", ["Abel", "Seth", "Noah"], "Genesis 2:7", OT, "easy"),
  ("Who deceived his father Isaac to receive Esau's blessing?", "Jacob", ["Laban", "Joseph", "Ishmael"], "Genesis 27:19", OT, "easy"),
  ("Which sea did God part so Israel could cross on dry ground?", "The Red Sea", ["The Dead Sea", "The Sea of Galilee", "The Mediterranean Sea"], "Exodus 15:4", OT, "easy"),
  ("How many commandments did God give Moses on the tablets?", "Ten", ["Seven", "Twelve", "Five"], "Exodus 34:28", OT, "easy"),
  ("On which mountain did Moses receive the Ten Commandments?", "Mount Sinai", ["Mount Carmel", "Mount Zion", "Mount Ararat"], "Exodus 19:20", OT, "easy"),
  ("Where did Noah's ark come to rest?", "The mountains of Ararat", ["Mount Sinai", "Mount Nebo", "Mount Hermon"], "Genesis 8:4", OT, "easy"),
  ("What sign did God give Noah of His promise never to flood the earth again?", "A rainbow", ["A dove", "A star", "An olive tree"], "Genesis 9:13", OT, "easy"),
  ("Whose great strength was tied to his uncut hair?", "Samson", ["Gideon", "Goliath", "Absalom"], "Judges 16:17", OT, "easy"),
  ("Who was the first king of Israel?", "Saul", ["David", "Solomon", "Samuel"], "1 Samuel 10:1", OT, "easy"),
  ("Which son of David asked God for wisdom?", "Solomon", ["Absalom", "Amnon", "Adonijah"], "1 Kings 3:9", OT, "easy"),
  ("Which prophet was taken up to heaven in a whirlwind?", "Elijah", ["Elisha", "Isaiah", "Jeremiah"], "2 Kings 2:11", OT, "easy"),
  ("Who was Moses' brother?", "Aaron", ["Joshua", "Caleb", "Levi"], "Exodus 4:14", OT, "easy"),
  ("Who was the mother of the prophet Samuel?", "Hannah", ["Naomi", "Ruth", "Deborah"], "1 Samuel 1:20", OT, "easy"),
  ("Which queen of Persia risked her life to save the Jewish people?", "Esther", ["Vashti", "Jezebel", "The Queen of Sheba"], "Esther 4:16", OT, "easy"),
  ("What food did God give Israel from heaven in the wilderness?", "Manna", ["Figs", "Bread from Egypt", "Dates"], "Exodus 16:31", OT, "easy"),
  ("Which city's walls fell after Israel marched around it?", "Jericho", ["Ai", "Jerusalem", "Babylon"], "Joshua 6:20", OT, "easy"),
  ("Who led Israel into the promised land after Moses died?", "Joshua", ["Caleb", "Aaron", "Gideon"], "Joshua 1:2", OT, "easy"),
  ("Who was Ruth's mother-in-law?", "Naomi", ["Orpah", "Hannah", "Elizabeth"], "Ruth 1:4", OT, "easy"),
  ("Which of these was one of Noah's sons?", "Shem", ["Seth", "Enoch", "Lot"], "Genesis 6:10", OT, "easy"),
  ("Which of his wives did Jacob love most?", "Rachel", ["Leah", "Bilhah", "Zilpah"], "Genesis 29:30", OT, "easy"),
  ("What new name did God give Jacob?", "Israel", ["Abraham", "Judah", "Peniel"], "Genesis 32:28", OT, "easy"),
  # ---- easy · New Testament ----
  ("In which town was Jesus born?", "Bethlehem", ["Nazareth", "Jerusalem", "Capernaum"], "Matthew 2:1", NT, "easy"),
  ("Who was the mother of Jesus?", "Mary", ["Elizabeth", "Martha", "Anna"], "Matthew 1:18", NT, "easy"),
  ("Who baptized Jesus in the Jordan?", "John the Baptist", ["Peter", "Andrew", "Philip"], "Matthew 3:13", NT, "easy"),
  ("How many apostles did Jesus choose?", "Twelve", ["Seven", "Ten", "Seventy"], "Luke 6:13", NT, "easy"),
  ("Which disciple betrayed Jesus?", "Judas Iscariot", ["Thomas", "Peter", "Thaddaeus"], "Matthew 26:14", NT, "easy"),
  ("Which disciple denied Jesus three times?", "Peter", ["John", "Judas", "James"], "Luke 22:61", NT, "easy"),
  ("What was the first miracle (sign) Jesus did?", "Turning water into wine", ["Feeding the 5,000", "Healing a blind man", "Walking on water"], "John 2:11", NT, "easy"),
  ("In which town did Jesus turn water into wine?", "Cana", ["Bethany", "Nazareth", "Jericho"], "John 2:1", NT, "easy"),
  ("On which day did Jesus rise from the dead?", "The third day", ["The first day", "The seventh day", "The fortieth day"], "1 Corinthians 15:4", NT, "easy"),
  ("Which tax collector climbed a tree to see Jesus?", "Zacchaeus", ["Matthew", "Nicodemus", "Bartimaeus"], "Luke 19:4", NT, "easy"),
  ("How many loaves did Jesus use to feed the 5,000?", "Five", ["Seven", "Two", "Twelve"], "Matthew 14:17", NT, "easy"),
  ("What did Jesus walk on to reach His disciples' boat?", "Water", ["A sandbar", "A bridge", "Ice"], "Matthew 14:25", NT, "easy"),
  ("Who wrote most of the letters in the New Testament?", "Paul", ["Peter", "John", "James"], "Romans 1:1", NT, "easy"),
  ("What was the apostle Paul's name before he was called Paul?", "Saul", ["Simon", "Silas", "Stephen"], "Acts 13:9", NT, "easy"),
  ("On the road to which city did Jesus appear to Saul?", "Damascus", ["Jerusalem", "Rome", "Antioch"], "Acts 9:3", NT, "easy"),
  ("Whom did Jesus raise after four days in the tomb?", "Lazarus", ["Jairus' daughter", "The widow's son", "Dorcas"], "John 11:39", NT, "easy"),
  ("Who was the Roman governor who handed Jesus over to be crucified?", "Pontius Pilate", ["Herod", "Caesar Augustus", "Felix"], "Matthew 27:26", NT, "easy"),
  ("What gifts did the wise men bring to Jesus?", "Gold, frankincense and myrrh", ["Silver, oil and wine", "Gold, silver and bronze", "Bread, fish and wine"], "Matthew 2:11", NT, "easy"),
  ("What is the prayer Jesus taught His disciples, beginning \"Our Father\", called?", "The Lord's Prayer", ["The Magnificat", "The Beatitudes", "The Great Commission"], "Matthew 6:9", NT, "easy"),
  # ---- easy · General ----
  ("What is the first book of the Bible?", "Genesis", ["Exodus", "Matthew", "Psalms"], "Genesis 1:1", GEN, "easy"),
  ("What is the last book of the Bible?", "Revelation", ["Jude", "Malachi", "Acts"], "Revelation 22:21", GEN, "easy"),
  ("How many books are in the New Testament?", "27", ["39", "66", "24"], "Matthew–Revelation", GEN, "easy"),
  ("How many books are in the Old Testament (Protestant Bible)?", "39", ["27", "46", "66"], "Genesis–Malachi", GEN, "easy"),
  ("What is the shortest verse in the English Bible (KJV)?", "\"Jesus wept.\"", ["\"Rejoice always.\"", "\"Pray continually.\"", "\"God is love.\""], "John 11:35", GEN, "easy"),
  ("Which psalm begins \"The LORD is my shepherd\"?", "Psalm 23", ["Psalm 1", "Psalm 91", "Psalm 119"], "Psalm 23:1", GEN, "easy"),
  # ---- medium · Old Testament ----
  ("Who was Abraham's nephew who lived in Sodom?", "Lot", ["Laban", "Nahor", "Ishmael"], "Genesis 14:12", OT, "medium"),
  ("What was the name of the son Hagar bore to Abraham?", "Ishmael", ["Isaac", "Esau", "Midian"], "Genesis 16:15", OT, "medium"),
  ("Who is the oldest person recorded in the Bible?", "Methuselah", ["Noah", "Adam", "Enoch"], "Genesis 5:27", OT, "medium"),
  ("Who interpreted Pharaoh's dream of seven fat and seven thin cows?", "Joseph", ["Daniel", "Moses", "Jacob"], "Genesis 41:25", OT, "medium"),
  ("How many plagues did God send on Egypt?", "Ten", ["Seven", "Twelve", "Three"], "Exodus 7–12", OT, "medium"),
  ("What was the last plague on Egypt?", "The death of the firstborn", ["Darkness", "Locusts", "Hail"], "Exodus 12:29", OT, "medium"),
  ("Which left-handed judge killed Eglon, king of Moab?", "Ehud", ["Othniel", "Shamgar", "Jephthah"], "Judges 3:15", OT, "medium"),
  ("Which judge defeated the Midianites with only 300 men?", "Gideon", ["Samson", "Barak", "Jephthah"], "Judges 7:7", OT, "medium"),
  ("Which prophetess judged Israel and went to battle with Barak?", "Deborah", ["Miriam", "Huldah", "Jael"], "Judges 4:4", OT, "medium"),
  ("Which priest raised the boy Samuel in the house of the LORD?", "Eli", ["Zadok", "Abiathar", "Phinehas"], "1 Samuel 2:11", OT, "medium"),
  ("Whose wife was Bathsheba before she married David?", "Uriah the Hittite", ["Joab", "Nabal", "Abner"], "2 Samuel 11:3", OT, "medium"),
  ("Which prophet confronted David after his sin with Bathsheba?", "Nathan", ["Samuel", "Gad", "Elijah"], "2 Samuel 12:7", OT, "medium"),
  ("Who was the wife of King Ahab who led Israel into Baal worship?", "Jezebel", ["Athaliah", "Michal", "Delilah"], "1 Kings 16:31", OT, "medium"),
  ("On which mountain did Elijah challenge the prophets of Baal?", "Mount Carmel", ["Mount Sinai", "Mount Gilboa", "Mount Moriah"], "1 Kings 18:19", OT, "medium"),
  ("Who succeeded Elijah as prophet?", "Elisha", ["Gehazi", "Obadiah", "Jonah"], "2 Kings 2:15", OT, "medium"),
  ("What names were Daniel's three friends given in Babylon?", "Shadrach, Meshach and Abednego", ["Mordecai, Haman and Hegai", "Shem, Ham and Japheth", "Eldad, Medad and Gad"], "Daniel 1:7", OT, "medium"),
  ("Which king of Babylon saw a hand writing on the wall?", "Belshazzar", ["Nebuchadnezzar", "Darius", "Cyrus"], "Daniel 5:5", OT, "medium"),
  ("Who led the rebuilding of Jerusalem's walls?", "Nehemiah", ["Ezra", "Zerubbabel", "Haggai"], "Nehemiah 6:15", OT, "medium"),
  ("For how many days and nights did it rain during the flood?", "40", ["7", "100", "150"], "Genesis 7:12", OT, "medium"),
  ("For how many years did Israel wander in the wilderness?", "40", ["7", "70", "12"], "Numbers 14:33", OT, "medium"),
  ("What did Esau sell his birthright for?", "A bowl of stew", ["Thirty pieces of silver", "A coat", "A flock of sheep"], "Genesis 25:34", OT, "medium"),
  ("Who was the father of King David?", "Jesse", ["Obed", "Boaz", "Saul"], "Ruth 4:22", OT, "medium"),
  ("Which prophet saw a valley of dry bones come to life?", "Ezekiel", ["Isaiah", "Jeremiah", "Daniel"], "Ezekiel 37:1", OT, "medium"),
  # ---- medium · New Testament ----
  ("Who was the father of John the Baptist?", "Zechariah", ["Joseph", "Simeon", "Zebedee"], "Luke 1:13", NT, "medium"),
  ("Who was the mother of John the Baptist?", "Elizabeth", ["Mary", "Anna", "Salome"], "Luke 1:13", NT, "medium"),
  ("Who was the high priest when Jesus was tried?", "Caiaphas", ["Annas", "Gamaliel", "Ananias"], "Matthew 26:57", NT, "medium"),
  ("Who was made to carry Jesus' cross?", "Simon of Cyrene", ["Simon Peter", "Joseph of Arimathea", "Barabbas"], "Mark 15:21", NT, "medium"),
  ("Who asked Pilate for Jesus' body and laid it in his own tomb?", "Joseph of Arimathea", ["Nicodemus", "Lazarus", "John"], "Matthew 27:57", NT, "medium"),
  ("Who was the first Christian martyr?", "Stephen", ["James", "Peter", "Philip"], "Acts 7:59", NT, "medium"),
  ("Which Pharisee came to Jesus by night?", "Nicodemus", ["Gamaliel", "Simon", "Joseph"], "John 3:2", NT, "medium"),
  ("On which feast did the Holy Spirit come upon the disciples?", "Pentecost", ["Passover", "Tabernacles", "Purim"], "Acts 2:1", NT, "medium"),
  ("Which disciple said he would not believe unless he saw the nail marks?", "Thomas", ["Philip", "Bartholomew", "Andrew"], "John 20:25", NT, "medium"),
  ("In Jesus' parable, who helped the man beaten by robbers?", "A Samaritan", ["A priest", "A Levite", "A Pharisee"], "Luke 10:33", NT, "medium"),
  ("In the parable of the lost son, what was he sent to feed?", "Pigs", ["Sheep", "Goats", "Camels"], "Luke 15:15", NT, "medium"),
  ("Which apostle was a tax collector, also called Levi?", "Matthew", ["Thaddaeus", "Bartholomew", "Simon the Zealot"], "Mark 2:14", NT, "medium"),
  ("Which two brothers did Jesus call \"Sons of Thunder\"?", "James and John", ["Peter and Andrew", "Philip and Nathanael", "Jude and Simon"], "Mark 3:17", NT, "medium"),
  ("Which physician wrote a Gospel and the book of Acts?", "Luke", ["Mark", "Titus", "Silas"], "Colossians 4:14", NT, "medium"),
  ("On which island was John when he received the Revelation?", "Patmos", ["Crete", "Cyprus", "Malta"], "Revelation 1:9", NT, "medium"),
  ("Who was chosen to replace Judas among the twelve?", "Matthias", ["Barsabbas", "Barnabas", "Silas"], "Acts 1:26", NT, "medium"),
  ("Which couple lied about the price of their land and died?", "Ananias and Sapphira", ["Aquila and Priscilla", "Zechariah and Elizabeth", "Ahab and Jezebel"], "Acts 5:1", NT, "medium"),
  ("Who travelled with Paul on his first missionary journey?", "Barnabas", ["Timothy", "Luke", "Silas"], "Acts 13:2", NT, "medium"),
  ("Paul's chapter on love (\"love is patient, love is kind\") was written to which church?", "Corinth", ["Rome", "Ephesus", "Philippi"], "1 Corinthians 13:4", NT, "medium"),
  ("What is the first fruit of the Spirit listed in Galatians?", "Love", ["Joy", "Peace", "Faith"], "Galatians 5:22", NT, "medium"),
  ("In which garden did Jesus pray before His arrest?", "Gethsemane", ["Eden", "Bethany", "Olivet"], "Matthew 26:36", NT, "medium"),
  ("What was the place where Jesus was crucified called?", "Golgotha", ["Gethsemane", "Gabbatha", "Gilgal"], "John 19:17", NT, "medium"),
  ("With how many loaves did Jesus feed the 4,000?", "Seven", ["Five", "Twelve", "Three"], "Matthew 15:34", NT, "medium"),
  ("In which city were the disciples first called Christians?", "Antioch", ["Jerusalem", "Rome", "Corinth"], "Acts 11:26", NT, "medium"),
  # ---- medium · General ----
  ("Which Gospel is the shortest?", "Mark", ["Matthew", "Luke", "John"], "Mark 1–16", GEN, "medium"),
  ("Which book of the Bible has the most chapters?", "Psalms", ["Isaiah", "Genesis", "Jeremiah"], "Psalms 1–150", GEN, "medium"),
  ("How many chapters are in the book of Psalms?", "150", ["120", "100", "176"], "Psalms 1–150", GEN, "medium"),
  # ---- hard · Old Testament ----
  ("Who was the father of Methuselah?", "Enoch", ["Lamech", "Jared", "Seth"], "Genesis 5:21", OT, "hard"),
  ("How many years did Methuselah live?", "969", ["950", "930", "777"], "Genesis 5:27", OT, "hard"),
  ("Which king of Judah began to reign at eight and found the Book of the Law in the temple?", "Josiah", ["Joash", "Hezekiah", "Uzziah"], "2 Kings 22:1", OT, "hard"),
  ("Who was the king of Salem and priest who blessed Abram?", "Melchizedek", ["Abimelech", "Jethro", "Bera"], "Genesis 14:18", OT, "hard"),
  ("Which prophet was told to marry Gomer?", "Hosea", ["Amos", "Micah", "Joel"], "Hosea 1:3", OT, "hard"),
  ("Which king dreamed of a statue of gold, silver, bronze, iron and clay?", "Nebuchadnezzar", ["Belshazzar", "Darius", "Pharaoh"], "Daniel 2:31", OT, "hard"),
  ("What was the name of Moses' wife?", "Zipporah", ["Miriam", "Jochebed", "Elisheba"], "Exodus 2:21", OT, "hard"),
  ("Who was Moses' father-in-law, the priest of Midian?", "Jethro", ["Laban", "Reuben", "Eli"], "Exodus 3:1", OT, "hard"),
  ("How many people were saved in Noah's ark?", "Eight", ["Six", "Ten", "Twelve"], "1 Peter 3:20", OT, "hard"),
  ("Which son of David was caught by his hair in an oak tree?", "Absalom", ["Amnon", "Adonijah", "Solomon"], "2 Samuel 18:9", OT, "hard"),
  ("Which king of Bashan had a bed made of iron?", "Og", ["Sihon", "Agag", "Balak"], "Deuteronomy 3:11", OT, "hard"),
  ("Whose donkey spoke to him?", "Balaam", ["Balak", "Gehazi", "Saul"], "Numbers 22:28", OT, "hard"),
  ("Ruth was the great-grandmother of which king?", "David", ["Saul", "Solomon", "Rehoboam"], "Ruth 4:17", OT, "hard"),
  # ---- hard · New Testament ----
  ("Who was Timothy's mother?", "Eunice", ["Lois", "Lydia", "Priscilla"], "2 Timothy 1:5", NT, "hard"),
  ("Which young man fell from a window while Paul preached late into the night?", "Eutychus", ["Tychicus", "Trophimus", "Onesimus"], "Acts 20:9", NT, "hard"),
  ("Which Roman centurion's household received the Holy Spirit when Peter preached?", "Cornelius", ["Julius", "Claudius Lysias", "Longinus"], "Acts 10:44", NT, "hard"),
  ("Which seller of purple cloth believed Paul's message in Philippi?", "Lydia", ["Dorcas", "Phoebe", "Chloe"], "Acts 16:14", NT, "hard"),
  ("Who baptized the Ethiopian official?", "Philip", ["Peter", "Paul", "Barnabas"], "Acts 8:38", NT, "hard"),
  ("Which tentmaking couple worked with Paul in Corinth?", "Aquila and Priscilla", ["Ananias and Sapphira", "Andronicus and Junia", "Philemon and Apphia"], "Acts 18:2", NT, "hard"),
]

def build():
    rng = random.Random(20261027)
    seen, out = set(), []
    for i, (q, right, wrong, ref, cat, diff) in enumerate(Q):
        assert q not in seen, f"duplicate question: {q}"
        seen.add(q)
        opts = [right] + wrong
        assert len(opts) == 4 and len(set(o.lower() for o in opts)) == 4, f"options must be 4 distinct: {q}"
        assert diff in ("easy", "medium", "hard") and cat in (OT, NT, GEN)
        # Spread the right answer evenly over A–D: cycle the slot, shuffle the rest.
        slot = i % 4
        others = wrong[:]
        rng.shuffle(others)
        opts = others[:slot] + [right] + others[slot:]
        out.append({"question": q, "options": opts, "answer": slot, "reference": ref, "category": cat, "difficulty": diff})
    return out

if __name__ == "__main__":
    data = build()
    Path(__file__).with_name("questions.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    from collections import Counter
    print(len(data), "questions |", dict(Counter(d["difficulty"] for d in data)), "|", dict(Counter(d["category"] for d in data)), "| answer slots", dict(Counter("ABCD"[d["answer"]] for d in data)))
