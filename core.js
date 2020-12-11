//Import libs
const showdown = require('showdown');
const showdownHighlight = require("showdown-highlight");
const cheerio = require('cheerio')
const fs = require('fs');

let search_data = {};

//Create conversor
const converter = new showdown.Converter({
    emoji: true,
    extensions: [showdownHighlight],
    tasklists: true,
    tables: true,
    strikethrough: true,
    ghMentions: true
});


//Aplly style to tags and return list of the sections
function applyStyle($, sections, simplesections) {
    $("h1,h2").each(function(i, elm) {
        simplesections.push([$(elm).text(), $(elm).attr("id")])
        sections.push({ text: $(elm).text(), level: $(elm).prop("tagName") == "H1" ? 0 : 1, color: $(elm).prop("tagName") == "H1" ? "black" : "gray", target: $(elm).attr("id") });
    });

    //Code      
    {
        $("code").css("background-color", "transparent");
        $("code").parent().addClass("hljs");
        $("code").parent().addClass("hljspre");
        $("code").addClass("hljscontent");

        //Get language for a code
        $("code").each(function(i, x) {
            let ss = $(x).attr("class").split(/\s+/);
            let language = "";
            for (let i in ss) {
                let s = ss[i];

                if (s.startsWith("language-")) {
                    language = s.substring(9);
                }
            }
        });
    }

    //Blockcode -> Messages
    $("blockquote").each(function(i, elm) {
        let content = $(elm).text().trim();
        let parent = $(elm).parent();

        let type = "info";
        if (content.match(new RegExp("^{.*}.*"))) {
            type = content.substr(1).split("}")[0];
            content = content.substr(content.indexOf("}") + 1);
        }
        let ctt = '<v-alert dense type="' + type + '" text>' + content.replace("\n", "<br>") + '</v-alert>';
        $(elm).replaceWith(ctt);
    });

    //Lists
    $("li").each(function(i, elm) {
        let content = $(elm).html();

        let onclick = "";

        if ($(this).find("a").length > 0) {
            onclick = 'window.location.href = \'' + $(this).find("a").attr("href") + "\'";
            $(elm).replaceWith('<div class="list_item linkholder" onclick="' + onclick + '"><b>' + content + "</b></div");
        } else
            $(elm).addClass("list_item");


        if ($(this).find("input").length > 0) {
            $(this).find("input").replaceWith("<v-checkbox " + ($(this).find("input").prop("checked") ? "input-value=\"true\"" : "") + " value disabled style=\"transform: translate(0px,-4px); float: left;height: 20px;margin-top: 0px; margin-bottom: 0px\"></v-checkbox>");
            $(this).replaceWith("<div class=\"list_item tasks\" style=\"height:30px\">" + $(this).html() + "<br></div>");
        }
    });

    //Table
    $("table").each(function(i, elm) {
        let content = $(elm).html();
        $(elm).replaceWith("<v-simple-table><template v-slot:default>" + content + "</template></v-simple-table>")
    });
}

//Create a page
function createPage(page, template, nav, home, header, footer, returnlink, versions, version, lang, labels, languages, language_index, page_path) {

    if (search_data[lang] == null)
        search_data[lang] = {};

    if (search_data[lang][version] == null)
        search_data[lang][version] = {};

    //Generate path breadcrumb
    let path = [];
    let sp = page_path.split("/");
    for (let i = 0; i < sp.length; i++)
        path.push({
            text: sp[i],
            disabled: true,
            normal: true,
            href: ''
        });

    //Read data
    let mds = fs.readFileSync("content/" + lang + "/" + page.source, { encoding: 'utf8', flag: 'r' });
    let content = converter.makeHtml(mds);
    let source = JSON.stringify(compressString(mds));
    const $ = cheerio.load(content);

    //Count words in content
    let counts = {},
        mr, mc;
    mds.match(/\w+/g).forEach(function(w) {
        if (w.length <= 2) return;
        counts[w] = (counts[w] || 0) + 1
    });

    let counts_keys = Object.keys(counts);
    let word_counts = [];

    for (let i = 0; i < counts_keys.length; i++)
        word_counts.push({ "word": counts_keys[i], "count": counts[counts_keys[i]] });

    word_counts.sort((a, b) => (a.count > b.count) ? -1 : 1)

    word_counts = word_counts.slice(0, Math.min(word_counts.length, 10));

    let words = [];

    for (let i = 0; i < word_counts.length; i++)
        words.push(word_counts[i].word);

    //Sections info
    let sections = [];
    let simplesections = [];

    //Format and get sections
    applyStyle($, sections, simplesections);

    search_data[lang][version][page_path] = {
        "title": page.title,
        "subtitle": page.subtitle,
        "tags": page.tags,
        "sections": simplesections,
        "words": words
    };

    //Check if is the lastest version
    let comp_version = parseFloat(version);
    let max = 0;
    let max_st = "";

    for (let i = 0; i < versions.length; i++) {
        let f = parseFloat(versions[i].title);
        if (f > max) {
            max = f;
            max_st = versions[i].title;
        }
    }


    let warnings = max > comp_version ? '<v-alert dense type="error" text>' + labels.outdated.replace("%%", version).replace("%%", max_st) + '</v-alert>' : '';

    if (!fs.existsSync("output/" + lang))
        fs.mkdirSync("output/" + lang);

    if (!fs.existsSync("output/" + lang + "/" + version))
        fs.mkdirSync("output/" + lang + "/" + version);

    if (!fs.existsSync("output/" + lang + "/" + version + "/" + page_path.split("/")[1]))
        fs.mkdirSync("output/" + lang + "/" + version + "/" + page_path.split("/")[1]);

    fs.writeFileSync("output/" + lang + "/" + page_path + ".html",
        template.replace("$$content$$", warnings += $("body").html())
        .replace("$$sections$$", JSON.stringify(sections))
        .replace("$$source$$", source)
        .replace("$$title$$", page.title)
        .replace("$$navtitle$$", "v" + version + " - " + page.title)
        .replace("$$subtitle$$", page.subtitle)
        .replace("$$last_change$$", JSON.stringify({
            author: page.last_modified[0],
            date: page.last_modified[1]
        }))
        .replace("$$creation$$", JSON.stringify({
            author: page.created[0],
            date: page.created[1]
        }))
        .replace("$$tags$$", JSON.stringify(page.tagsb))
        .replace("$$versionlabel$$", page.version)
        .replace("$$navigation$$", JSON.stringify(nav))
        .replace("$$path$$", JSON.stringify(path))
        .replace("$$home$$", "../" + home)
        .replace("$$header$$", header)
        .replace("$$footer$$", footer)
        .replace("$$return$$", returnlink)
        .replace("$$version$$", version)
        .replace("$$versions$$", JSON.stringify(versions))

        .replace("$$lang_change$$", labels.version_change)
        .replace("$$lang_sections$$", labels.sections)
        .replace("$$lang_tags$$", labels.tags)
        .replace("$$lang_created$$", labels.last_edited)
        .replace("$$lang_edited$$", labels.created_by)
        .replace("$$lang_footer$$", labels.footer)
        .replace("$$languages$$", JSON.stringify(languages))
        .replace("$$currentlanguage$$", language_index)
        .replace("$$curlang$$", lang)
        .replace("$$languagetitle$$", labels.language_title)
        .replace("$$languagetext$$", labels.language_text)
        .replace("$$languageclose$$", labels.language_close)
        .replace("$$search$$", labels.search)
        .replace("$$noresults_pre$$", labels.search_no_results)
        .replace("$$noresults$$", labels.search_no_results)
        .replace("$$searchfirst$$", lang)
        .replace("$$searchsecond$$", version)
    );
}

//Used to compress source code
function compressString(c) {
    var x = 'charCodeAt',
        b, e = {},
        f = c.split(""),
        d = [],
        a = f[0],
        g = 256;
    for (b = 1; b < f.length; b++) c = f[b], null != e[a + c] ? a += c : (d.push(1 < a.length ? e[a] : a[x](0)), e[a + c] = g, g++, a = c);
    d.push(1 < a.length ? e[a] : a[x](0));
    for (b = 0; b < d.length; b++) d[b] = String.fromCharCode(d[b]);
    return d.join("")
}

//Used to generate website
function exportFiles() {
    console.log("Stating exportation process..");
    console.log("");

    //1 - Delete old files
    {
        var deleteFolderRecursive = function(path) {
            if (fs.existsSync(path)) {
                fs.readdirSync(path).forEach(function(file, index) {
                    var curPath = path + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(path);
            }
        };


        console.log("Deleting old files...");
        let n = 0;
        fs.readdirSync("output").forEach(file => {
            if (file != "code_styles" && file != "css" && file != "js" && file != "media") {
                if (!fs.lstatSync("output/" + file).isDirectory())
                    fs.unlinkSync("output/" + file);
                else
                    deleteFolderRecursive("output/" + file);
                n++;
            }
        });
        console.log("Deleted " + n + " old files!");
    }

    //2 - Load languages.json & template.html
    if (!fs.existsSync("languages.json")) {
        console.log(">> ERROR: File 'languages.json' not found!");
        return;
    }
    let langs = JSON.parse(fs.readFileSync("languages.json", { encoding: 'utf8', flag: 'r' }));

    //Template
    if (!fs.existsSync("internal/template.html")) {
        console.log(">> ERROR: File 'internal/template.html' not found!");
        return;
    }
    let template = fs.readFileSync("internal/template.html", { encoding: 'utf8', flag: 'r' });

    //Load structure file
    if (!fs.existsSync("structure.json")) {
        console.log(">> ERROR: File 'structure.json' not found!");
        return;
    }
    let structure = JSON.parse(fs.readFileSync("structure.json", { encoding: 'utf8', flag: 'r' }));

    //Languages to be shown on menu
    let language_structure = [];
    //List of versions to be shown
    let versions_structure = [];

    //Not translated navigation 
    let navigation_structure = {};

    //List of files to load
    let pages = [];

    console.log("Parsing structure...");

    //Iterate over versions
    for (let j = 0; j < Object.keys(structure.docs).length; j++) {
        let version = Object.keys(structure.docs)[j];

        let navigation = [];

        let home = "";
        let tags = {};

        //Iterate over structure
        for (let k = 0; k < Object.keys(structure.docs[version]).length; k++) {
            let block = Object.keys(structure.docs[version])[k];

            if (block == "home")
                home = structure.docs[version][block];
            else if (block == "tags") {
                tags = structure.docs[version][block];
            } else if (block == "structure") {
                let struct = structure.docs[version][block];

                //Iterate over sections
                for (let l = 0; l < Object.keys(struct).length; l++) {
                    let section = Object.keys(struct)[l];

                    navigation.push({
                        text: section,
                        isheader: true,
                    });

                    //Iterate over pages
                    for (let m = 0; m < Object.keys(struct[section]).length; m++) {
                        let page_id = Object.keys(struct[section])[m];

                        //Create info for file
                        let page = struct[section][page_id];
                        page.home = home;
                        page.version = version;
                        page.mypath = section + "/" + page_id;

                        let formatted_tags = [];

                        //Load tags for file
                        for (let n = 0; n < page.tags.length; n++)
                            formatted_tags.push({
                                text: page.tags[n],
                                color: tags[page.tags[n]].color
                            });

                        page.tagsb = formatted_tags;

                        pages.push(page);

                        navigation.push({
                            text: section + "/" + page_id,
                            icon: "mdi-" + page.icon,
                            isheader: false,
                            href: "../" + section + "/" + page_id
                        });
                    }
                }
            }
        }

        versions_structure.push({
            title: version,
            home: "../../" + version + "/" + home
        });

        navigation_structure[version] = navigation;
    }

    let lang_structure = [];

    console.log("\nParsing languages...");

    for (let langi in Object.keys(langs)) {
        let lang = Object.keys(langs)[langi];
        lang_structure.push({ text: langs[lang], href: lang });
    }

    //Iterate over languages
    for (let i = 0; i < Object.keys(langs).length; i++) {
        let language = Object.keys(langs)[i];

        console.log("\nGenerating files for '" + language + "'...");

        //Translated navigations
        let translated_navigations = {};

        let translation = JSON.parse(fs.readFileSync("content/" + language + "/translation.json", { encoding: 'utf8', flag: 'r' }));

        for (let n = 0; n < pages.length; n++) {

            if (translated_navigations[pages[n].version] == null) {
                translated_navigations[pages[n].version] = JSON.parse(JSON.stringify(navigation_structure[pages[n].version]));
                for (let o = 0; o < translated_navigations[pages[n].version].length; o++) {
                    let tt = translated_navigations[pages[n].version][o].text;
                    if (translation[pages[n].version] != null) {
                        if (translation[pages[n].version][tt] != null) {
                            tt = translation[pages[n].version][tt];

                            if (Array.isArray(tt))
                                tt = tt[0];
                        }
                    }

                    translated_navigations[pages[n].version][o].text = tt;
                }
            }

            pages[n].title = pages[n].mypath;
            pages[n].subtitle = "";

            if (translation[pages[n].version] != null) {
                if (translation[pages[n].version][pages[n].mypath] != null) {
                    pages[n].title = translation[pages[n].version][pages[n].mypath][0];
                    pages[n].subtitle = translation[pages[n].version][pages[n].mypath][1];
                }
            }

            createPage(pages[n], template, translated_navigations[pages[n].version], pages[n].home, translation.header, translation.footer, structure.return,
                versions_structure, pages[n].version, language, translation.labels, lang_structure, i, pages[n].version + "/" + pages[n].mypath);
        }

        console.log("Generated " + pages.length + " files!");
    }

    console.log("\nGenerating 'search.json' ...");
    fs.writeFileSync("output/search.json", JSON.stringify(search_data, null, 2));
    //search_data

    console.log("\n>>> Final Results: ");
    console.log(">>> Versions: " + versions_structure.length);
    console.log(">>> Languages: " + Object.keys(langs).length);
    console.log(">>> Pages: " + pages.length * (Object.keys(langs).length));


}