Hi! I'm Jake and I'm <span class="what-am-i"></span> from <a href="https://maps.app.goo.gl/znExp4xj4njYNqs5A" target="_blank">Salt Lake City, UT</a> currently living in <a href="https://maps.app.goo.gl/MMfmNDXtF19uJNqSA" target="_blank">Brooklyn, NY</a>.
I use code to <a href="https://jakewelch.design" target="_blank">design cool projects</a> and to <a href="https://instagram.com/jake___welch" target="_blank">experiment with new ideas</a>.
In my free time I love to <a href="https://www.goodreads.com/jakewelch" target="_blank">read</a>, <a href="https://by.jakewel.ch" target="_blank">write</a>, and fall down <a href="https://www.are.na/jake-welch" target="_blank">research and archiving</a> rabbit holes,
usually related to <a href="https://www.are.na/jake-welch/ancient-yyde53qgkce">history</a>, <a href="https://www.are.na/jake-welch/art-gallery-zdcjhk1yrrc"> art</a>, and <a href="https://www.are.na/jake-welch/found-deep-on-the-internet"> the internet</a>.
<br><br> 
Feel free to poke around, every box you see has a header with the file name as it's saved on my computer, and  clicking it links to its source code. Inside the boxes you'll find text, images, and gifs, many of which might link to something cool, so click around! While this site works <I>okay</I> on mobile, desktop is highly recommended.
<br><br>
If you're at all
interested in building your own personal site, I've written a <a href="https://tutorials.jakewel.ch/build-a-website.html" target="_blank">beginner-friendly guide</a> on how to do that for free! 
<br><br>
Thanks for visiting!

<style>
.what-am-i {
display: inline-block;
width: 105px;
text-align: center;
}
</style>

<script>
        const words = [
            "a designer",
            "a developer",
            "an artist",
            "a researcher",
            "a listener",
            "a cat owner",
            "a technologist",
            "a ponderer",
            "a daydreamer",
            "a programmer",
	    "a luddite",
	    "a park enjoyer",
	    "a writer",
	    "a reader", 
	    "a web surfer",
	    "a history buff",
	    "an archivist",
	    "a documentarian",
	    "a friend",
        ];
        let index = 0;
        const span = document.querySelector('.what-am-i');
        setInterval(() => {
            span.textContent = words[index];
            index = (index + 1) % words.length;
        }, 500);
    </script>
